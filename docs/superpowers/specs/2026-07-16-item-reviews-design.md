# Item Reviews (Buyer Ratings) Design

## Overview

Add a buyer review system to the campus marketplace. Only users who have purchased an item (order status `paid` or `completed`) can leave a star rating and text review. Each order allows exactly one review.

## Acceptance Criteria

| ID   | Criterion                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | A logged-in user with a `paid` or `completed` order for an item can submit a review with a 1–5 star rating and text content (10–500 characters). |
| AC-2 | Each order can have at most one review; duplicate submissions are rejected with HTTP 409.                                                        |
| AC-3 | The item detail page displays all reviews for that item, sorted newest-first, with pagination (10 per page).                                     |
| AC-4 | The item detail page shows the item's average rating (rounded to 1 decimal) and total review count.                                              |
| AC-5 | Unauthenticated users and users without an eligible order see the review list but not the review form.                                           |
| AC-6 | A user who has already reviewed via a specific order sees "已评价" instead of the form for that order.                                           |
| AC-7 | Admin users can delete any review via `DELETE /api/reviews/:id`.                                                                                 |

## Data Model

### New table: `reviews`

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_item ON reviews(item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
```

The `UNIQUE(order_id)` constraint enforces one review per order at the database level.

## API Contract

### GET `/api/items/:id/reviews`

List reviews for an item. Public (no auth required).

**Query parameters:**

| Name     | Type    | Required | Default | Description           |
| -------- | ------- | -------- | ------- | --------------------- |
| page     | integer | no       | 1       | Page number (≥1)      |
| pageSize | integer | no       | 10      | Items per page (1–50) |

**Response 200:**

```json
{
  "data": [
    {
      "id": 1,
      "rating": 5,
      "content": "商品很好，卖家态度也不错",
      "createdAt": "2026-07-16T10:00:00Z",
      "user": { "id": 2, "username": "小明同学" }
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 10,
  "averageRating": 4.3,
  "reviewCount": 15
}
```

### POST `/api/items/:id/reviews`

Create a review. Requires authentication.

**Request body:**

```json
{
  "orderId": 42,
  "rating": 5,
  "content": "商品很好，卖家态度也不错"
}
```

**Validation rules:**

- `orderId`: required integer, must belong to the authenticated user, must reference the same `itemId`, order status must be `paid` or `completed`.
- `rating`: required integer, 1–5.
- `content`: required string, 10–500 characters after trimming.

**Response 201:**

```json
{
  "id": 1,
  "orderId": 42,
  "itemId": 5,
  "userId": 2,
  "rating": 5,
  "content": "商品很好，卖家态度也不错",
  "createdAt": "2026-07-16T10:00:00Z"
}
```

**Error responses:**

| Status | Condition                                                                   |
| ------ | --------------------------------------------------------------------------- |
| 400    | Invalid input (missing fields, out-of-range rating, content too short/long) |
| 401    | Not authenticated                                                           |
| 403    | Order does not belong to user, or order status is not paid/completed        |
| 404    | Item or order not found                                                     |
| 409    | Review already exists for this order                                        |

### GET `/api/items/:id/reviews/eligibility`

Check if the current user can review this item. Requires authentication.

**Response 200:**

```json
{
  "eligible": true,
  "orderId": 42,
  "hasReviewed": false
}
```

- `eligible`: true if the user has at least one `paid`/`completed` order for this item.
- `orderId`: the most recent eligible order ID (null if not eligible).
- `hasReviewed`: true if the user has already submitted a review for the eligible order.

If the user has multiple eligible orders, return the most recent one that hasn't been reviewed. If all are reviewed, `eligible` is false.

**Response 401:** Not authenticated.

### DELETE `/api/reviews/:id`

Delete a review. Admin only.

**Response 204:** No content.

**Error responses:**

| Status | Condition         |
| ------ | ----------------- |
| 401    | Not authenticated |
| 403    | Not admin         |
| 404    | Review not found  |

## Backend Architecture

### New files

| File                                          | Responsibility                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `backend/src/service/review.service.ts`       | Business logic: eligibility check, create review, list reviews, delete review |
| `backend/src/controller/review.controller.ts` | HTTP handling: parse params, validate input, call service, return JSON        |

### Modified files

| File                                      | Change                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| `backend/src/service/database.service.ts` | Add `reviews` table creation and indexes in `createSchema()` |
| `contracts/openapi.yaml`                  | Add review endpoints and schemas                             |

### Service design

`ReviewService` depends on `DatabaseService` (injected). Key methods:

- `listByItem(itemId, page, pageSize)` → paginated reviews + averageRating + reviewCount
- `checkEligibility(userId, itemId)` → { eligible, orderId, hasReviewed }
- `create(userId, itemId, orderId, rating, content)` → Review
- `remove(reviewId)` → void

### Controller design

`ReviewController` uses `@Controller('/api')` with routes:

- `@Get('/items/:id/reviews')` — public
- `@Post('/items/:id/reviews')` — `@Middleware([AuthMiddleware])`
- `@Get('/items/:id/reviews/eligibility')` — `@Middleware([AuthMiddleware])`
- `@Del('/reviews/:id')` — `@Middleware([AuthMiddleware])` + admin role check

## Frontend Architecture

### New components

| Component       | Location                                     | Description                                                                         |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ReviewSection` | `frontend/src/components/review-section.tsx` | Client component: displays average rating, review list, pagination, and review form |
| `StarRating`    | `frontend/src/components/star-rating.tsx`    | Reusable star rating display/input component                                        |

### Modified files

| File                                   | Change                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `frontend/src/app/items/[id]/page.tsx` | Add `<ReviewSection itemId={id} />` below the tips section                         |
| `frontend/src/lib/api.ts`              | Add `getItemReviews()`, `createReview()`, `checkReviewEligibility()` API functions |
| `frontend/src/lib/types.ts`            | Add `Review`, `ReviewListResponse`, `ReviewEligibility` types                      |

### UI layout

The `ReviewSection` renders below the existing "交易小贴士" block:

1. **Header**: "买家评价 (N)" + average rating with stars
2. **Review form** (conditional): shown only if `eligible && !hasReviewed`
   - Star selector (1–5 clickable stars)
   - Textarea (placeholder: "分享您的购买体验...")
   - Submit button
3. **Review list**: cards with username, stars, content, date
4. **Pagination**: simple prev/next buttons
5. **Empty state**: "暂无评价" when no reviews exist

### States

- Loading: skeleton/spinner while fetching reviews
- Empty: "暂无评价，购买后可来评价哦～"
- Eligible + not reviewed: show form
- Eligible + already reviewed: show "您已评价" badge
- Not eligible / not logged in: show reviews only, no form

## Testing

### Backend tests

- `backend/test/review.test.mts`:
  - Create review with valid paid order → 201
  - Create review with valid completed order → 201
  - Reject review for pending_payment order → 403
  - Reject duplicate review → 409
  - Reject review for another user's order → 403
  - Reject invalid rating (0, 6) → 400
  - Reject content too short (<10 chars) → 400
  - List reviews with pagination
  - Average rating calculation
  - Eligibility check: eligible, not eligible, already reviewed
  - Admin delete review → 204
  - Non-admin delete review → 403

## Out of Scope

- Seller reply to reviews (may add in future iteration)
- Image/video attachments in reviews
- Review editing after submission
- Review sorting by rating filter
- Notification to seller when a review is posted
