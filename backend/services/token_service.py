from datetime import datetime, timedelta
from typing import Any, Dict, Tuple

AST_UPLOAD_COST_PER_MB = 0.5
AST_DAILY_EARN_PER_GB = 0.5
AST_SIGNUP_BONUS = 50.0

_BYTES_PER_MB = 1024 * 1024
_BYTES_PER_GB = 1024 * 1024 * 1024
_SECONDS_PER_DAY = 24 * 60 * 60


def _to_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def calculate_upload_cost(file_size_bytes: int) -> float:
    if file_size_bytes <= 0:
        return 0.0
    mb_size = file_size_bytes / _BYTES_PER_MB
    return round(mb_size * AST_UPLOAD_COST_PER_MB, 4)


async def apply_daily_storage_rewards(db, user_doc: Dict[str, Any]) -> Tuple[Dict[str, Any], float]:
    """Accrue whole-day AST rewards for pledged storage and persist updated balance."""
    storage_pledged_bytes = float(user_doc.get("storage_pledged", 0) or 0)
    if storage_pledged_bytes <= 0:
        return user_doc, 0.0

    now = datetime.utcnow()
    last_reward_at = (
        _to_datetime(user_doc.get("last_storage_reward_at"))
        or _to_datetime(user_doc.get("last_pledge_at"))
        or _to_datetime(user_doc.get("registered_at"))
        or now
    )

    elapsed_seconds = max(0, (now - last_reward_at).total_seconds())
    full_days_elapsed = int(elapsed_seconds // _SECONDS_PER_DAY)
    if full_days_elapsed <= 0:
        return user_doc, 0.0

    pledged_gb = storage_pledged_bytes / _BYTES_PER_GB
    reward_amount = round(pledged_gb * AST_DAILY_EARN_PER_GB * full_days_elapsed, 4)
    if reward_amount <= 0:
        return user_doc, 0.0

    current_balance = float(user_doc.get("token_balance", 0.0) or 0.0)
    new_balance = round(current_balance + reward_amount, 4)
    processed_until = last_reward_at + timedelta(days=full_days_elapsed)

    await db.users.update_one(
        {"node_id": user_doc["node_id"]},
        {
            "$set": {
                "token_balance": new_balance,
                "last_storage_reward_at": processed_until,
            }
        },
    )

    await db.token_transactions.insert_one(
        {
            "node_id": user_doc["node_id"],
            "type": "earn",
            "amount": reward_amount,
            "description": f"Daily storage rewards for {full_days_elapsed} day(s)",
            "category": "storage_daily",
            "timestamp": now,
        }
    )

    updated_doc = dict(user_doc)
    updated_doc["token_balance"] = new_balance
    updated_doc["last_storage_reward_at"] = processed_until
    return updated_doc, reward_amount


async def ensure_signup_bonus(db, user_doc: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
    """Grant one-time 50 AST signup bonus for legacy users missing the migration transaction."""
    node_id = user_doc.get("node_id")
    if not node_id:
        return user_doc, False

    existing_signup_tx = await db.token_transactions.find_one(
        {
            "node_id": node_id,
            "category": "signup",
        }
    )
    if existing_signup_tx:
        return user_doc, False

    current_balance = float(user_doc.get("token_balance", 0.0) or 0.0)
    new_balance = round(current_balance + AST_SIGNUP_BONUS, 4)
    now = datetime.utcnow()

    await db.users.update_one(
        {"node_id": node_id},
        {
            "$set": {
                "token_balance": new_balance,
                "signup_reward_notified": False,
            }
        },
    )

    await db.token_transactions.insert_one(
        {
            "node_id": node_id,
            "type": "earn",
            "amount": AST_SIGNUP_BONUS,
            "description": "Signup reward",
            "category": "signup",
            "timestamp": now,
        }
    )

    updated_doc = dict(user_doc)
    updated_doc["token_balance"] = new_balance
    updated_doc["signup_reward_notified"] = False
    return updated_doc, True


async def reconcile_balance_from_transactions(db, user_doc: Dict[str, Any]) -> Tuple[Dict[str, Any], float]:
    """Recompute a user's balance from transaction history and persist if needed."""
    node_id = user_doc.get("node_id")
    if not node_id:
        return user_doc, float(user_doc.get("token_balance", 0.0) or 0.0)

    cursor = db.token_transactions.find({"node_id": node_id}, {"_id": 0, "type": 1, "amount": 1})
    transactions = await cursor.to_list(length=1000)

    calculated_balance = 0.0
    for tx in transactions:
        amount = float(tx.get("amount", 0.0) or 0.0)
        if tx.get("type") == "spend":
            calculated_balance -= amount
        else:
            calculated_balance += amount

    calculated_balance = round(calculated_balance, 4)
    stored_balance = round(float(user_doc.get("token_balance", 0.0) or 0.0), 4)

    if calculated_balance != stored_balance:
        await db.users.update_one(
            {"node_id": node_id},
            {"$set": {"token_balance": calculated_balance}},
        )
        updated_doc = dict(user_doc)
        updated_doc["token_balance"] = calculated_balance
        return updated_doc, calculated_balance

    return user_doc, stored_balance
