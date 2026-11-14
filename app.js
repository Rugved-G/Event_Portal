// === Event Portal (Firebase Firestore + Free Auth) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { 
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvjPDLJEKttc5kYUWMbh1VhJc4pZD2v1Y",
  authDomain: "event-portal-v1.firebaseapp.com",
  projectId: "event-portal-v1",
  storageBucket: "event-portal-v1.firebasestorage.app",
  messagingSenderId: "661092896781",
  appId: "1:661092896781:web:99fadbda9ba046bd608544"
};


// Initialize Firebase, Firestore & Auth
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
let currentUser = null;

// --- Auth State Observer ---
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    authBtn.textContent = 'Logout (Admin)';
    btnAdd.classList.remove('hidden');
  } else {
    authBtn.textContent = 'Admin Login';
    btnAdd.classList.add('hidden');
  }
  render(); // Re-render to show/hide edit/delete buttons
});

// --- Login / Logout Handler ---
authBtn.addEventListener('click', async () => {
  if (currentUser) {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  } else {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login error:', err);
    }
  }
});

// --- Fetch Events ---
async function fetchEvents() {
  try {
    const snapshot = await getDocs(eventsCol);
    allEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (allEvents.length === 0) {
      await seedInitialData();
      return;
    }
    render();
  } catch (err) {
    console.error("Error loading events:", err);
  }
}

// --- Seed Initial Data ---
async function seedInitialData() {
  const samples = [
    {
      title: 'Rock Concert',
      type: 'Music',
      venue: 'Stadium',
      location: 'Mumbai',
      age: '18+',
      dateTime: '2026-12-10T19:00',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
      description: 'Rock night!',
      seats: 500
    },
    {
      title: 'Football Finals',
      type: 'Sports',
      venue: 'Arena',
      location: 'Delhi',
      age: 'All',
      dateTime: '2026-12-20T17:00',
      imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600',
      description: 'National league final.',
      seats: 300
    }
  ];
  for (const item of samples) {
    await addDoc(eventsCol, item);
  }
  fetchEvents();
}

// --- Render & Filter Events ---
function render() {
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
    card.querySelector('.meta').textContent = `${e.type} | ${e.location} | ${new Date(e.dateTime).toLocaleString()}`;
    card.querySelector('.desc').textContent = e.description;

    const actions = card.querySelector('.card-actions');
    
    const regBtn = document.createElement('a');
    regBtn.className = 'btn primary';
    regBtn.textContent = 'Register';
    regBtn.href = googleFormLink(e);
    regBtn.target = '_blank';
    actions.appendChild(regBtn);

    // Only show Edit and Delete buttons if logged in as Admin
    if (currentUser) {
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

    eventsGrid.appendChild(node);
  });
}

// --- Helpers ---
function googleFormLink(e) {
  return 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?usp=pp_url&entry.123='
    + encodeURIComponent(e.title);
}

function openModal() { modal.classList.remove('hidden'); }
function closeModal() { modal.classList.add('hidden'); form.reset(); editId = null; }

// --- Add Event ---
btnAdd.addEventListener('click', () => {
  if (!currentUser) return alert('Please login as admin first!');
  editId = null;
  document.getElementById('modalTitle').textContent = 'Add Event';
  openModal();
});

// --- Save Event ---
form.addEventListener('submit', async ev => {
  ev.preventDefault();
  if (!currentUser) return alert('Unauthorized');

  const obj = Object.fromEntries(new FormData(form).entries());
  obj.seats = Number(obj.seats) || 0;

  try {
    if (editId) {
      const eventRef = doc(db, "events", editId);
      await updateDoc(eventRef, obj);
    } else {
      await addDoc(eventsCol, obj);
    }
    closeModal();
    await fetchEvents();
  } catch (err) {
    console.error("Error saving event:", err);
  }
});

// --- Edit & Delete ---
function editEvent(id) {
  if (!currentUser) return;
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
  if (!currentUser) return;
  if (!confirm('Delete this event?')) return;
  try {
    await deleteDoc(doc(db, "events", id));
    await fetchEvents();
  } catch (err) {
    console.error("Error deleting event:", err);
  }
}

document.getElementById('btnCancel').addEventListener('click', closeModal);

// --- Filters & UI Toggles ---
const filterElements = [...filterTypes, ...ageRadios];
filterElements.forEach(el => el.addEventListener('change', render));
if (locSelect) locSelect.addEventListener('change', render);
if (startDateInput) startDateInput.addEventListener('change', render);
if (endDateInput) endDateInput.addEventListener('change', render);

const toggleSidebar = document.getElementById('toggleSidebar');
const sidebar = document.querySelector('.sidebar');
if (toggleSidebar && sidebar) {
  toggleSidebar.addEventListener('click', () => sidebar.classList.toggle('hidden'));
}

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

// --- Init ---
fetchEvents();

window.addEventListener('load', () => {
  const splash = document.getElementById('openingAnimation');
  setTimeout(() => splash?.remove(), 4000);
});