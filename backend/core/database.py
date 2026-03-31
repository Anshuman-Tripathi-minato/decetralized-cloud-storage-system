from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings
import logging
from datetime import datetime
from copy import deepcopy

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


class InMemoryCollection:
    """Simple in-memory collection for testing without MongoDB."""
    def __init__(self):
        self.documents = []
        self.indexes = []

    @staticmethod
    def _iter_path_values(data, parts):
        if not parts:
            return [data]

        key = parts[0]
        rest = parts[1:]

        if isinstance(data, list):
            values = []
            for item in data:
                values.extend(InMemoryCollection._iter_path_values(item, parts))
            return values

        if isinstance(data, dict) and key in data:
            return InMemoryCollection._iter_path_values(data[key], rest)

        return []

    @staticmethod
    def _doc_values(doc, path):
        return InMemoryCollection._iter_path_values(doc, path.split("."))

    @staticmethod
    def _value_matches_operator(doc_values, operator, expected):
        if operator == "$exists":
            has_value = len(doc_values) > 0
            return has_value if expected else not has_value
        if operator == "$eq":
            return any(value == expected for value in doc_values)
        if operator == "$ne":
            return all(value != expected for value in doc_values)
        if operator == "$gt":
            return any(value is not None and value > expected for value in doc_values)
        if operator == "$gte":
            return any(value is not None and value >= expected for value in doc_values)
        if operator == "$lt":
            return any(value is not None and value < expected for value in doc_values)
        if operator == "$lte":
            return any(value is not None and value <= expected for value in doc_values)
        if operator == "$in":
            return any(value in expected for value in doc_values)
        if operator == "$nin":
            return all(value not in expected for value in doc_values)
        return False

    @classmethod
    def _matches_query(cls, doc, query):
        if not query:
            return True

        for key, condition in query.items():
            if key == "$or":
                if not isinstance(condition, list) or not any(cls._matches_query(doc, sub_query) for sub_query in condition):
                    return False
                continue

            if key == "$and":
                if not isinstance(condition, list) or not all(cls._matches_query(doc, sub_query) for sub_query in condition):
                    return False
                continue

            doc_values = cls._doc_values(doc, key)

            if isinstance(condition, dict):
                for operator, expected in condition.items():
                    if not cls._value_matches_operator(doc_values, operator, expected):
                        return False
            else:
                if len(doc_values) == 0:
                    return False
                if not any(value == condition for value in doc_values):
                    return False

        return True

    @staticmethod
    def _apply_projection(doc, projection):
        if projection is None:
            return deepcopy(doc)

        include_fields = {k for k, v in projection.items() if v}
        exclude_fields = {k for k, v in projection.items() if not v}

        if include_fields:
            projected = {}
            for field in include_fields:
                if field in doc:
                    projected[field] = deepcopy(doc[field])
            if projection.get("_id", 1) and "_id" in doc:
                projected["_id"] = deepcopy(doc["_id"])
            return projected

        projected = deepcopy(doc)
        for field in exclude_fields:
            projected.pop(field, None)
        return projected

    def _filter_documents(self, query=None, projection=None):
        query = query or {}
        matched = []
        for doc in self.documents:
            if self._matches_query(doc, query):
                matched.append(self._apply_projection(doc, projection))
        return matched

    class _Cursor:
        def __init__(self, documents):
            self._documents = documents
            self._limit = None

        def sort(self, field, direction=1):
            reverse = direction == -1

            def sort_key(doc):
                values = InMemoryCollection._doc_values(doc, field)
                value = values[0] if values else None
                return (value is None, value)

            self._documents.sort(key=sort_key, reverse=reverse)
            return self

        def limit(self, n):
            self._limit = max(0, int(n)) if n is not None else None
            return self

        def _iter_docs(self):
            docs = self._documents
            if self._limit is not None:
                docs = docs[: self._limit]
            return docs

        async def to_list(self, length=None):
            docs = self._iter_docs()
            if length is None:
                return [deepcopy(doc) for doc in docs]
            safe_length = max(0, int(length))
            return [deepcopy(doc) for doc in docs[:safe_length]]

        def __aiter__(self):
            self._index = 0
            self._snapshot = self._iter_docs()
            return self

        async def __anext__(self):
            if self._index >= len(self._snapshot):
                raise StopAsyncIteration
            item = self._snapshot[self._index]
            self._index += 1
            return item

    class _AggregateCursor:
        def __init__(self, documents):
            self._documents = documents

        def __aiter__(self):
            self._index = 0
            return self

        async def __anext__(self):
            if self._index >= len(self._documents):
                raise StopAsyncIteration
            item = self._documents[self._index]
            self._index += 1
            return item

    async def insert_one(self, doc):
        # Check unique constraints
        for index_field, is_unique in self.indexes:
            if is_unique and index_field in doc:
                existing = [d for d in self.documents if d.get(index_field) == doc.get(index_field)]
                if existing:
                    raise Exception(f"Duplicate key error on {index_field}")
        
        # Auto-generate _id if not present
        if "_id" not in doc:
            doc["_id"] = str(len(self.documents))
        
        self.documents.append(doc.copy())
        return type('obj', (object,), {'inserted_id': doc["_id"]})

    async def find_one(self, query=None, projection=None, sort=None):
        matched = self._filter_documents(query=query, projection=projection)
        if sort:
            for field, direction in reversed(sort):
                reverse = direction == -1
                matched.sort(
                    key=lambda doc: (
                        (lambda vals: (vals[0] if vals else None))(self._doc_values(doc, field)) is None,
                        (lambda vals: (vals[0] if vals else None))(self._doc_values(doc, field)),
                    ),
                    reverse=reverse,
                )
        if matched:
            return deepcopy(matched[0])
        return None

    def find(self, query=None, projection=None):
        documents = self._filter_documents(query=query, projection=projection)
        return InMemoryCollection._Cursor(documents)

    def aggregate(self, pipeline):
        docs = [deepcopy(doc) for doc in self.documents]

        for stage in pipeline:
            if "$match" in stage:
                docs = [doc for doc in docs if self._matches_query(doc, stage["$match"])]
                continue

            if "$group" in stage:
                group_spec = stage["$group"]
                grouped_doc = {"_id": group_spec.get("_id")}

                for target_field, expr in group_spec.items():
                    if target_field == "_id":
                        continue

                    if "$sum" in expr:
                        source = expr["$sum"]
                        if isinstance(source, str) and source.startswith("$"):
                            field = source[1:]
                            total = 0
                            for doc in docs:
                                values = self._doc_values(doc, field)
                                value = values[0] if values else 0
                                total += value or 0
                            grouped_doc[target_field] = total
                        else:
                            grouped_doc[target_field] = (source or 0) * len(docs)
                    elif "$avg" in expr:
                        source = expr["$avg"]
                        if isinstance(source, str) and source.startswith("$"):
                            field = source[1:]
                            values = []
                            for doc in docs:
                                field_values = self._doc_values(doc, field)
                                if field_values and field_values[0] is not None:
                                    values.append(field_values[0])
                            grouped_doc[target_field] = (sum(values) / len(values)) if values else None
                        else:
                            grouped_doc[target_field] = None

                docs = [grouped_doc]

        return InMemoryCollection._AggregateCursor(docs)

    async def update_one(self, query, update):
        for doc in self.documents:
            match = self._matches_query(doc, query)
            if match:
                if "$set" in update:
                    doc.update(update["$set"])
                if "$inc" in update:
                    for k, v in update["$inc"].items():
                        doc[k] = doc.get(k, 0) + v
                return type('obj', (object,), {'modified_count': 1})
        return type('obj', (object,), {'modified_count': 0})

    async def delete_one(self, query):
        for i, doc in enumerate(self.documents):
            match = self._matches_query(doc, query)
            if match:
                self.documents.pop(i)
                return type('obj', (object,), {'deleted_count': 1})
        return type('obj', (object,), {'deleted_count': 0})

    async def count_documents(self, query=None):
        if query is None:
            return len(self.documents)
        count = 0
        for doc in self.documents:
            if self._matches_query(doc, query):
                count += 1
        return count

    async def distinct(self, key, query=None):
        values = []
        seen = set()
        for doc in self.documents:
            if not self._matches_query(doc, query or {}):
                continue
            for value in self._doc_values(doc, key):
                if value not in seen:
                    seen.add(value)
                    values.append(value)
        return values

    async def create_index(self, field, unique=False):
        self.indexes.append((field, unique))


class InMemoryDatabase:
    """In-memory database for testing without MongoDB."""
    def __init__(self):
        self.users = InMemoryCollection()
        self.files = InMemoryCollection()
        self.chunks = InMemoryCollection()
        self.storage_containers = InMemoryCollection()
        self.blockchain_logs = InMemoryCollection()
        self.token_transactions = InMemoryCollection()
        self.api_errors = InMemoryCollection()

    async def list_collection_names(self):
        return [
            "users",
            "files",
            "chunks",
            "storage_containers",
            "blockchain_logs",
            "token_transactions",
            "api_errors",
        ]



async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,
            socketTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        # Test connection
        await client.admin.command("ping")
        db = client[settings.DB_NAME]
        logger.info(f"✅ Connected to MongoDB: {settings.MONGO_URI} / {settings.DB_NAME}")
        await _create_indexes()
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        logger.warning("⚠️  Using in-memory database for testing — data will not persist")
        db = InMemoryDatabase()
        await _create_indexes_inmemory()


async def disconnect_db():
    global client
    if client:
        client.close()
        logger.info("🔌 MongoDB connection closed")


async def _create_indexes():
    """Create database indexes on startup."""
    try:
        # Users collection indexes
        await db.users.create_index("node_id", unique=True)
        await db.users.create_index("public_key_fingerprint", unique=True)

        # Files collection indexes
        await db.files.create_index("cid", unique=True)
        await db.files.create_index("owner_node_id")

        # Chunks collection indexes
        await db.chunks.create_index("chunk_id", unique=True)
        await db.chunks.create_index("cid")

        # Blockchain logs indexes
        await db.blockchain_logs.create_index("tx_hash", unique=True)
        await db.blockchain_logs.create_index("timestamp")
        await db.blockchain_logs.create_index("event_type")

        # Token transactions indexes
        await db.token_transactions.create_index("node_id")
        await db.token_transactions.create_index("timestamp")

        logger.info("✅ MongoDB indexes created")
    except Exception as e:
        logger.warning(f"⚠️  Index creation warning: {e}")


async def _create_indexes_inmemory():
    """Create indexes for in-memory database."""
    try:
        await db.users.create_index("node_id", unique=True)
        await db.users.create_index("public_key_fingerprint", unique=True)
        await db.files.create_index("cid", unique=True)
        await db.files.create_index("owner_node_id")
        await db.chunks.create_index("chunk_id", unique=True)
        await db.chunks.create_index("cid")
        await db.storage_containers.create_index("node_id", unique=True)
        await db.blockchain_logs.create_index("tx_hash", unique=True)
        await db.blockchain_logs.create_index("timestamp")
        await db.blockchain_logs.create_index("event_type")
        await db.token_transactions.create_index("node_id")
        await db.token_transactions.create_index("timestamp")
        logger.info("✅ In-memory database indexes created")
    except Exception as e:
        logger.warning(f"⚠️  In-memory index creation warning: {e}")


def get_db():
    return db
