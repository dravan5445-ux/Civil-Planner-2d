# Planora — AI Floor Plan Studio (Frontend Prototype)

## Run it
1. Extract the ZIP.
2. Open `index.html` in a modern browser, or serve the folder with a local development server.
3. Click **Create my floor plan**. Create a demo account, fill in the form, generate a preview, then use the demo unlock to show plot dimensions and download an SVG.

## Included
- Responsive landing page with service explanation and ₹50 pricing.
- Demo signup/login stored in browser localStorage.
- Requirements form: plot dimensions, facing/road direction, floors, shape, BHK, parking, staircase location, attached bathroom, separate WC, doors/windows, age-friendly needs and extra notes.
- Generated conceptual 2D SVG preview with room labels, doors and windows.
- Demo unlock flow and SVG download.

## Important limitations before launch
This is a **frontend prototype**, not a production AI architectural generator. The layout is a simplified illustration and is not guaranteed to fit the exact plot dimensions or comply with local rules. Do not use it as a construction drawing.

To launch commercially, connect:
- Secure authentication (for example, a backend with hashed passwords and session management; do not store raw passwords in localStorage).
- Backend/API and a genuine layout-generation engine with geometric constraints, setbacks, wall thickness, door/window clearance, circulation, plumbing, structure, ventilation and local building rules.
- Server-side order/payment verification using a payment gateway such as Razorpay or another supported provider. Never unlock downloads based only on a browser-side flag.
- PDF/SVG export with dimension checks and a clear versioned project record.
- Privacy policy, terms, refund policy and professional review workflow.

The ₹50 flow here is simulated and does not charge money. The downloaded SVG contains illustrative plot-level dimensions only; room sizes are not calculated or certified.
