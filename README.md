# Blissful Kar Rentals - Full Stack Application

This is a complete full-stack car rental website application built with Node.js, Express, and vanilla JavaScript. It features a public-facing website for users and a secure, private admin dashboard for managing the car inventory.

## Features

### Public Website
- **Single Page Application (SPA)**: Smooth, fast navigation without page reloads.
- **Featured Vehicles**: A curated list of cars on the homepage.
- **Full Fleet View**: Browse all available cars with search and filtering capabilities.
- **Detailed Car Pages**: View multiple images and detailed specifications for each car.

### Admin Dashboard
- **Secure Authentication**: A robust, server-side login system using `bcrypt` for password hashing.
- **Full CRUD for Cars**: Admins can Create, Read, Update, and Delete car listings.
- **Persistent Storage**: Car and admin data is saved to JSON files (`cars.json`, `credentials.json`), so data is not lost on server restart.
- **Image Uploads**: Supports multiple image uploads with server-side resizing (`sharp`) and a user-friendly preview system.

## API Endpoints
- `GET /api/cars` - List all cars
- `POST /api/cars` - Add a new car (handles `multipart/form-data`)
- `PUT /api/cars/:id` - Update a car by ID (handles `multipart/form-data`)
- `DELETE /api/cars/:id` - Delete a car by ID
- `POST /api/admin/login` - Secure admin login.
- `POST /api/admin/setup` - Secure, one-time setup for the first admin account.

## Usage
1. Install dependencies:
   ```
   npm install
   ```
2. Start the development server:
   ```
   node server.js
   ```
3. Open `index.html` in your browser. The API will be available at `http://localhost:3001`.
   - To access the admin panel, navigate to `login.html`.
   - **Note**: To test on mobile devices, you must update the hardcoded IP address in `script.js` and `admin.js`.
