# Event-Portal

EventPortal.com is a fully functional, zero-cost full-stack event portal built using HTML, CSS, JavaScript, Firebase, and Google Apps Script — designed to allow users to browse, filter, register in real-time, and securely manage events with role-based permissions.

---

## 🚀 Features

- 🎬 **Opening Animation:**  
  A cinematic intro showing *“EventPortal.com”* with smooth motion and automatic fade-out.

- 🧭 **Advanced Sidebar Filters:**  
  Filter events dynamically by type, age restriction, location, and date range.

- 🔒 **Role-Based Access Control (RBAC) & Creator Security:**  
  - Secure Google Authentication (`Firebase Auth`).
  - Events can be added and edited by authenticated admins.
  - **Strict Deletion Hierarchy:** Events can *only* be deleted by their specific creator or the designated Main Admin.

- 🎟️ **Real-Time Seat Booking & Google Sheets Logging:**  
  - Interactive seat reservation modal with live inventory updates via Firebase Firestore.
  - Automatic backend logging of attendee registrations (Timestamp, Event ID, Title, Name, Email, Seats Booked) directly into a Google Spreadsheet using a Google Apps Script webhook.

- 🌙 **Dark Mode & UX Enhancements:**  
  - Built-in dark theme toggle with `localStorage` persistence.
  - Responsive mobile sidebar toggle and micro-interactions on buttons.

---

## 🗂️ Project Structure

```
📁 EventPortal/
│
├── index.html         # Main web page structure & modals
├── styles.css        # Comprehensive styling, layout, and dark mode
├── app.js            # Frontend logic, Firebase integration, & Webhook sync
└── README.md         # Project documentation
```

---

## 🧠 Technologies Used

| Technology | Purpose |
|-------------|----------|
| **HTML5** | Page structure, templates, and modal views |
| **CSS3** | Responsive layouts, animations, and Dark Mode styling |
| **JavaScript (ES6 Modules)** | DOM manipulation, state management, and async operations |
| **Firebase Firestore & Auth** | Real-time NoSQL database and secure Google OAuth login |
| **Google Apps Script & Sheets** | Serverless webhook endpoint for automated registration logging |
| **Vercel** | Production hosting and CI/CD deployment |

---

## ⚙️ Configuration & Setup

### 1. Firebase Setup
Ensure Firestore and Google Auth are enabled in your Firebase console. Update your credentials in `app.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Google Sheets Webhook Setup
1. Create a Google Sheet with headers: `Timestamp` | `Event ID` | `Event Title` | `Attendee Name` | `Attendee Email` | `Seats Booked`.
2. Go to **Extensions** > **Apps Script** and deploy the `doPost(e)` script as a Web App (`Execute as: Me`, `Access: Anyone`).
3. Paste your deployed Web App URL into `app.js`:
```javascript
const GOOGLE_SHEET_WEBHOOK_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";
```

---

## 💡 How to Run Locally

1. **Clone this repository**
   ```bash
   git clone https://github.com/your-username/EventPortal.git
   ```

2. **Navigate into the folder**
   ```bash
   cd EventPortal
   ```

3. **Run via Live Server**
   - Open the project in VS Code and launch `index.html` using the **Live Server** extension.

---

## 🧑‍💻 Author

**Rugved Ganapuram**  
💡 *Built with HTML, CSS, JavaScript, Firebase, and Google Apps Script.*

---

## 🏷️ License

This project is open-source under the **MIT License**.  
Feel free to use, modify, and share!

---

### 📸 Preview

<img width="1894" height="1017" alt="img1" src="https://github.com/user-attachments/assets/ea640930-0faf-4899-89cf-3ce980aee2a3" />



---
