# Security Specification for SellFlow

## Data Invariants
1. All documents (BusinessProfile, Product, Lead, Order, Review) MUST have an `ownerId` that matches the creator's UID.
2. `BusinessProfile` documents MUST be stored at `/businesses/{userId}` where `{userId}` matches `ownerId`.
3. `Products`, `Leads`, `Orders`, and `Reviews` MUST be owned by a specific business.
4. `Orders` and `Reviews` MUST reference valid `Products` and `Leads`.
5. Only the `ownerId` can perform write operations on most documents, except for `Leads` and `Reviews` which can be created by customers from the storefront.
6. `Products` are publicly readable if they are `isActive`.

## The Dirty Dozen Payloads

### 1. Identity Spoofing (Product)
Attempt to create a product for another user.
```json
{
  "name": "Hacked Product",
  "price": 100,
  "type": "physical",
  "isActive": true,
  "ownerId": "attacker_uid"
}
```
*Expected Result: PERMISSION_DENIED*

### 2. Privilege Escalation (BusinessProfile)
Attempt to mark a business as verified without admin rights.
```json
{
  "name": "My Shop",
  "whatsappNumber": "12345",
  "storeSlug": "myshop",
  "isVerified": true,
  "ownerId": "user_uid"
}
```
*Expected Result: PERMISSION_DENIED*

### 3. State Shortcutting (Lead)
Attempt to create a lead already in 'paid' status from the storefront.
```json
{
  "name": "Attacker",
  "phone": "999",
  "status": "paid",
  "ownerId": "business_owner_uid"
}
```
*Expected Result: PERMISSION_DENIED*

### 4. Shadow Update (Order)
Attempt to update an order's `amount` to $0 after creation.
```json
{
  "amount": 0
}
```
*Expected Result: PERMISSION_DENIED*

### 5. ID Poisoning (Review)
Attempt to use a massive string as a document ID.
*Expected Result: Rejected by `isValidId()`*

### 6. Relational Orphan (Order)
Attempt to create an order referencing a non-existent product or lead.
*Expected Result: Rejected by `exists()` checks*

### 7. Terminal State Modification (Order)
Attempt to update an order after it has reach 'completed' status.
*Expected Result: PERMISSION_DENIED*

### 8. Value Poisoning (Product Price)
Attempt to set a negative price.
```json
{ "price": -50 }
```
*Expected Result: PERMISSION_DENIED*

### 9. Resource Exhaustion (Lead Notes)
Attempt to send a massive string (1MB+) in `notes`.
*Expected Result: Rejected by `.size() <= MAX` checks*

### 10. Metadata Integrity (createdAt)
Attempt to set a future `createdAt` timestamp.
*Expected Result: Rejected by `request.time` check*

### 11. Unauthorized Read (Leads)
Attempt to list another business's leads.
*Expected Result: PERMISSION_DENIED*

### 12. Cross-Business Review Injection
Attempt to add a review to Business A's product using a review document that claims to be owned by Business B.
*Expected Result: PERMISSION_DENIED*
