# 🚀 MyTube Backend Project

This is the backend repository for the **myTube** application, a comprehensive social platform designed for video content sharing and management. It is built using a **Node.js, Express, and MongoDB (MEN) architecture**, focusing on a robust, scalable API for video handling, user interaction, and detailed social features.

---

## ✨ Core Features

This project provides a complete set of APIs to power a modern video-sharing platform, supporting content creation, user engagement, and analytics.

### 1. User Authentication & Profile Management

* **Secure Authentication:** User registration, login, logout, and token refresh using JWT and secure cookies.
* **Account Security:** Functionality to change the user's password.
* **Profile Customization:** Ability to update user details, avatar image, and channel cover image.
* **Channel Views:** Access to the current user's profile, channel-specific pages, and watch history.

### 2. Video Content Management

* **Video Lifecycle:** Full API support to upload, retrieve, update details, and delete videos.
* **Publishing Control:** Toggle the public/private status of a video at any time.
* **Discovery:** Retrieve all videos available on the platform and fetch specific videos by ID.

### 3. Social Interaction & Engagement

* **Liking System:** Users can like/unlike videos, comments, and tweets.
* **Commenting:** Create, update, and delete comments on videos, as well as fetch all comments for a specific video.
* **Subscriptions:** Follow and unfollow channels/users. Retrieve a list of channels subscribed to, and view the list of subscribers for any given channel.
* **Short-Form Updates (Tweets):** Create, modify, and delete short text updates, and fetch all tweets posted by a user.

### 4. Content Organization (Playlists)

* **Playlist Creation:** Create, retrieve, update details, and delete video playlists.
* **Management:** Add and remove videos from any existing playlist.

### 5. Analytics & Dashboard

* **Channel Performance:** Retrieve key statistics for the user's channel (e.g., total views, subscriber count).
* **Content Inventory:** Fetch a complete list of videos published by the channel.

---

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Web Framework:** Express
* **Database/ODM:** MongoDB/Mongoose (with Aggregation and Pagination)
* **Cloud Storage:** Cloudinary
* **Security:** JWT (JSON Web Tokens), Bcrypt (Password Hashing)
* **File Handling:** Multer, ffprobe

---

## ⚙️ Installation and Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Abdul-Wahab08/MyTube.git
    cd MyTube
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the project in development mode:**
    ```bash
    npm run dev
    ```

### 🔑 Environment Variables

To run this project, you need to create a `.env` file in the root directory and provide the following variables:

| Variable | Description |
| :--- | :--- |
| `PORT` | The port the server will run on (e.g., 8000) |
| `MONGODB_URI` | Connection string for MongoDB database |
| `CORS_ORIGIN` | Allowed domains for API access (e.g., http://localhost:5173 or `*`) |
| `ACCESS_TOKEN_SECRET` | Secret key for signing JWT access tokens |
| `ACCESS_TOKEN_EXPIRY` | Expiry duration for access tokens (e.g., 1d) |
| `REFRESH_TOKEN_SECRET` | Secret key for signing JWT refresh tokens |
| `REFRESH_TOKEN_EXPIRY` | Expiry duration for refresh tokens (e.g., 10d) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API Secret |

---

## 👤 Author

**Abdul Wahab**

---

## 📜 License

This project is licensed under the **ISC License**.

---
