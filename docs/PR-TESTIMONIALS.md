# PR: Testimonials on Each Card

## Summary
- Adds a small "card meta" row under each card showing:
  - "Sold to us by: User ####"
  - "NN copies sold"
- Counts increment live when the user adds that card to the cart.
- Data is seeded deterministically from the card name (demo-only).

## Files Changed
- `index.html`: Styling for `.card-meta`, `.testimonial-user`, `.testimonial-sold`.
- `fetchCardImages.js`: Seeded testimonial data, live updates on purchase.

## Acceptance Criteria
- Every card tile shows a testimonial row with user id and copies sold.
- Adding to cart increases the displayed copies sold count by 1.
- Desktop and mobile layouts remain stable.

## Notes
- This is placeholder/demo logic. Real testimonials can be fetched from an API and can include usernames, timestamps, and counts from real data.
