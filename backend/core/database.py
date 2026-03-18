from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


class InMemoryCollection:
    """Simple in-memory collection for testing without MongoDB."""
    def __init__(self):
        self.documents = []
        self.indexes = []

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

    async def find_one(self, query):
        for doc in self.documents:
            match = all(doc.get(k) == v for k, v in query.items())
            if match:
                return doc.copy()
        return None

    async def find(self, query=None):
        query = query or {}
        result = []
        for doc in self.documents:
            match = all(doc.get(k) == v for k, v in query.items())
            if match:
                result.append(doc.copy())
        return result

    async def update_one(self, query, update):
        for doc in self.documents:
            match = all(doc.get(k) == v for k, v in query.items())
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
            match = all(doc.get(k) == v for k, v in query.items())
            if match:
                self.documents.pop(i)
                return type('obj', (object,), {'deleted_count': 1})
        return type('obj', (object,), {'deleted_count': 0})

    async def count_documents(self, query=None):
        if query is None:
            return len(self.documents)
        count = 0
        for doc in self.documents:
            match = all(doc.get(k) == v for k, v in query.items())
            if match:
                count += 1
        return count

    async def create_index(self, field, unique=False):
        self.indexes.append((field, unique))


class InMemoryDatabase:
    """In-memory database for testing without MongoDB."""
    def __init__(self):
        self.users = InMemoryCollection()
        self.files = InMemoryCollection()
        self.chunks = InMemoryCollection()
        self.blockchain_logs = InMemoryCollection()
        self.token_transactions = InMemoryCollection()



async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
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
