// === Event Portal (Creator/Main-Admin Control + Seat Booking + Google Sheets) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { 
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, increment 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// 1. CONFIGURATION — UPDATE THESE TWO VALUES
const MAIN_ADMIN_EMAIL = "your-email@gmail.com"; // <-- Put your main admin Google email here
const GOOGLE_SHEET_WEBHOOK_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; // <-- Paste URL from Part 1

const firebaseConfig = {
  apiKey: "AIzaSyDvjPDLJEKttc5kYUWMbh1VhJc4pZD2v1Y",
  authDomain: "event-portal-v1.firebaseapp.com",
  projectId: "event-portal-v1",
  storageBucket: "event-portal-v1.firebasestorage.app",
  messagingSenderId: "661092896781",
  appId: "1:661092896781:web:99fadbda9ba046bd608544"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const eventsCol = collection(db, "events");

// DOM Elements
const btnAdd = document.getElementById('btnAdd');
const authBtn = document.getElementById('authBtn');
const modal = document.getElementById('modal');
const form = document.getElementById('eventForm');
const regModal = document.getElementById('regModal');
const regForm = document.getElementById('regForm');
const eventsGrid = document.getElementById('eventsGrid');
const tpl = document.getElementById('cardTpl');
const filterTypes = document.querySelectorAll('.filter-type');
const ageRadios = document.getElementsByName('age');
const locSelect = document.getElementById('filterLocation');
const startDateInput = document.getElementById('filterStartDate');
const endDateInput = document.getElementById('filterEndDate');
const darkModeToggle = document.getElementById('darkModeToggle');

let allEvents = [];
let editId = null;
let selectedEventForReg = null;
let currentUser = null;

// --- Auth State Observer ---
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    const roleLabel = user.email === MAIN_ADMIN_EMAIL ? 'Main Admin' : 'Admin';
    if (authBtn) authBtn.textContent = `Logout (${roleLabel})`;
    if (btnAdd) btnAdd.classList.remove('hidden');
  } else {
    if (authBtn) authBtn.textContent = 'Admin Login';
    if (btnAdd) btnAdd.classList.add('hidden');
  }
  render();
});

if (authBtn) {
  authBtn.addEventListener('click', async () => {
    if (currentUser) {
      await signOut(auth);
    } else {
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        alert('Login failed: ' + err.message);
      }
    }
  });
}

// --- Fetch Events ---
async function fetchEvents() {
  try {
    const snapshot = await getDocs(eventsCol);
    allEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  } catch (err) {
    console.error("Error loading events:", err);
  }
}

// --- Render & Filter Events ---
function render() {
  if (!eventsGrid || !tpl) return;
  const activeTypes = [...filterTypes].filter(x => x.checked).map(x => x.value);
  const age = [...ageRadios].find(x => x.checked)?.value || 'All';
  const loc = locSelect?.value || '';
  const startDate = startDateInput?.value ? new Date(startDateInput.value) : null;
  const endDate = endDateInput?.value ? new Date(endDateInput.value) : null;

  const filtered = allEvents.filter(e => {
    const eventDate = new Date(e.dateTime);
    const typeOK = activeTypes.length ? activeTypes.includes(e.type) : true;
    const ageOK = (age === 'All' || e.age === age);
    const locOK = loc ? e.location === loc : true;
    const startOK = !startDate || eventDate >= startDate;
    const endOK = !endDate || eventDate <= endDate;
    return typeOK && ageOK && locOK && startOK && endOK;
  });

  eventsGrid.innerHTML = '';
  filtered.forEach(e => {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.card');
    card.querySelector('.thumb').src = e.imageUrl || 'https://via.placeholder.com/400x200';
    card.querySelector('.title').textContent = e.title;
    
    const availableSeats = e.seats ?? 0;
    card.querySelector('.meta').textContent = 
      `${e.type} | ${e.location} | ${new Date(e.dateTime).toLocaleString()} | Seats: ${availableSeats}`;
    card.querySelector('.desc').textContent = e.description;

    const actions = card.querySelector('.card-actions');
    
    // Register / Book Seats Button
    const regBtn = document.createElement('button');
    regBtn.className = 'btn primary';
    if (availableSeats > 0) {
      regBtn.textContent = 'Register';
      regBtn.onclick = () => openRegModal(e);
    } else {
      regBtn.textContent = 'Sold Out';
      regBtn.disabled = true;
      regBtn.style.opacity = '0.5';
      regBtn.style.cursor = 'not-allowed';
    }
    actions.appendChild(regBtn);

    // Permission Check: Creator OR Main Admin
    if (currentUser) {
      const isMainAdmin = currentUser.email === MAIN_ADMIN_EMAIL;
      const isCreator = e.createdBy === currentUser.uid;

      if (isMainAdmin || isCreator) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => editEvent(e.id);
        actions.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn danger';
        delBtn.textContent = 'Delete';
        delBtn.onclick = () => deleteEvent(e.id);
        actions.appendChild(delBtn);
      }
    }

    eventsGrid.appendChild(node);
  });
}

// --- Seat Registration Logic & Google Sheets Sync ---
function openRegModal(eventObj) {
  selectedEventForReg = eventObj;
  document.getElementById('regModalTitle').textContent = `Register: ${eventObj.title}`;
  document.getElementById('regSeatsAvailable').textContent = `Available seats: ${eventObj.seats}`;
  const seatsInput = document.getElementById('regSeatsInput');
  seatsInput.max = eventObj.seats;
  seatsInput.value = 1;
  regModal.classList.remove('hidden');
}

function closeRegModal() {
  regModal.classList.add('hidden');
  regForm.reset();
  selectedEventForReg = null;
}

document.getElementById('btnCancelReg')?.addEventListener('click', closeRegModal);

regForm?.addEventListener('submit', async ev => {
  ev.preventDefault();
  if (!selectedEventForReg) return;

  const formData = Object.fromEntries(new FormData(regForm).entries());
  const requestedSeats = Number(formData.seats);

  if (requestedSeats > selectedEventForReg.seats) {
    return alert(`Only ${selectedEventForReg.seats} seats remaining!`);
  }

  const submitBtn = document.getElementById('btnConfirmReg');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Booking...';

  try {
    // 1. Deduct seats in Firestore
    const eventRef = doc(db, "events", selectedEventForReg.id);
    await updateDoc(eventRef, {
      seats: increment(-requestedSeats)
    });

    // 2. Send registration row to Google Sheets
    if (GOOGLE_SHEET_WEBHOOK_URL && GOOGLE_SHEET_WEBHOOK_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL") {
      await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Google Apps Script webhooks
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventForReg.id,
          eventTitle: selectedEventForReg.title,
          name: formData.name,
          email: formData.email,
          seats: requestedSeats
        })
      });
    }

    alert(`Booking confirmed for ${requestedSeats} seat(s)!`);
    closeRegModal();
    await fetchEvents();
  } catch (err) {
    console.error("Booking error:", err);
    alert("Failed to complete booking. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Booking';
  }
});

// --- Add / Edit / Delete Event ---
function openModal() { modal.classList.remove('hidden'); }
function closeModal() { modal.classList.add('hidden'); form.reset(); editId = null; }

btnAdd?.addEventListener('click', () => {
  if (!currentUser) return alert('Please login as admin first!');
  editId = null;
  document.getElementById('modalTitle').textContent = 'Add Event';
  openModal();
});

form?.addEventListener('submit', async ev => {
  ev.preventDefault();
  if (!currentUser) return alert('Unauthorized');

  const obj = Object.fromEntries(new FormData(form).entries());
  obj.seats = Number(obj.seats) || 0;

  try {
    if (editId) {
      await updateDoc(doc(db, "events", editId), obj);
    } else {
      // Tag the event with the creator's UID and email
      obj.createdBy = currentUser.uid;
      obj.creatorEmail = currentUser.email;
      await addDoc(eventsCol, obj);
    }
    closeModal();
    await fetchEvents();
  } catch (err) {
    console.error("Error saving event:", err);
    alert("Permission denied or error saving event.");
  }
});

function editEvent(id) {
  const e = allEvents.find(x => x.id === id);
  if (!e) return;
  editId = id;
  document.getElementById('modalTitle').textContent = 'Edit Event';
  for (const k in e) {
    if (form[k]) form[k].value = e[k];
  }
  openModal();
}

async function deleteEvent(id) {
  if (!confirm('Delete this event permanently?')) return;
  try {
    await deleteDoc(doc(db, "events", id));
    await fetchEvents();
  } catch (err) {
    console.error("Error deleting event:", err);
    alert("Permission denied: Only the event creator or Main Admin can delete this.");
  }
}

document.getElementById('btnCancel')?.addEventListener('click', closeModal);

// --- Filters & UI Toggles ---
const filterElements = [...filterTypes, ...ageRadios];
filterElements.forEach(el => el.addEventListener('change', render));
locSelect?.addEventListener('change', render);
startDateInput?.addEventListener('change', render);
endDateInput?.addEventListener('change', render);

const toggleSidebar = document.getElementById('toggleSidebar');
const sidebar = document.querySelector('.sidebar');
toggleSidebar?.addEventListener('click', () => sidebar.classList.toggle('hidden'));

if (darkModeToggle) {
  darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkModeToggle.checked);
    localStorage.setItem('darkMode', darkModeToggle.checked);
  });
  if (localStorage.getItem('darkMode') === 'true') {
    darkModeToggle.checked = true;
    document.body.classList.add('dark');
  }
}

// Init
fetchEvents();

window.addEventListener('load', () => {
  const splash = document.getElementById('openingAnimation');
  setTimeout(() => splash?.remove(), 4000);
});
