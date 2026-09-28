const API_BASE_URL = "http://localhost:8081";

const api = {
  request(path, options = {}) {
    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
    }).then(async (response) => {
      const raw = response.status === 204 ? "" : await response.text();
      let result = null;
      try { result = raw ? JSON.parse(raw) : null; } catch { result = null; }
      if (!response.ok) {
        const serverMessage = result?.error || result?.message;
        const statusMessage = {
          400: "Please check the information and try again.",
          404: "That record could not be found. It may have been removed.",
          409: "This change conflicts with existing event data.",
          500: "The server couldn’t complete that request. Please try again."
        }[response.status];
        throw new Error(serverMessage || statusMessage || `Request failed (${response.status}).`);
      }
      return result;
    }).catch((error) => {
      if (error instanceof TypeError) {
        throw new Error("Unable to connect to EventEase. Make sure Spring Boot is running on port 8081.");
      }
      throw error;
    });
  },
  getEvents(filters = {}) {
    const params = new URLSearchParams();
    if (filters.date) params.set("date", filters.date);
    else if (filters.title) params.set("title", filters.title);
    else if (filters.open) params.set("open", "true");
    return this.request(`/api/events${params.size ? `?${params}` : ""}`);
  },
  getEvent: (id) => api.request(`/api/events/${id}`),
  createEvent: (organizerId, event) => api.request(`/api/events?organizerId=${encodeURIComponent(organizerId)}`, { method: "POST", body: JSON.stringify(event) }),
  updateEvent: (id, event) => api.request(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(event) }),
  deleteEvent: (id) => api.request(`/api/events/${id}`, { method: "DELETE" }),
  getStudents: () => api.request("/api/students"),
  createStudent: (student) => api.request("/api/students", { method: "POST", body: JSON.stringify(student) }),
  updateStudent: (id, student) => api.request(`/api/students/${id}`, { method: "PUT", body: JSON.stringify(student) }),
  deleteStudent: (id) => api.request(`/api/students/${id}`, { method: "DELETE" }),
  getOrganizers: () => api.request("/api/organizers"),
  createOrganizer: (organizer) => api.request("/api/organizers", { method: "POST", body: JSON.stringify(organizer) }),
  updateOrganizer: (id, organizer) => api.request(`/api/organizers/${id}`, { method: "PUT", body: JSON.stringify(organizer) }),
  deleteOrganizer: (id) => api.request(`/api/organizers/${id}`, { method: "DELETE" }),
  getRegistrations: () => api.request("/api/registrations"),
  getStudentRegistrations: (studentId) => api.request(`/api/students/${studentId}/registrations`),
  getEventParticipants: (eventId) => api.request(`/api/events/${eventId}/participants`),
  registerStudent: (eventId, studentId) => api.request(`/api/events/${eventId}/registrations/${studentId}`, { method: "POST" }),
  cancelRegistration: (eventId, studentId) => api.request(`/api/events/${eventId}/registrations/${studentId}/cancel`, { method: "POST" })
};

const state = {
  events: [], students: [], organizers: [], registrations: [], visibleEvents: [],
  currentEvent: null, registrationStudentId: "", lastSection: "events"
};
const $ = (id) => document.getElementById(id);
const retryActions = new Map();
let retrySequence = 0;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const dateLabel = (value, options = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, options) : "Date to be announced";
const dateTimeLabel = (value) => value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const idValue = (value) => String(value ?? "");

function notify(message, kind = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${kind}`;
  toast.innerHTML = `<span class="toast-mark">${kind === "success" ? "✓" : "!"}</span><span>${escapeHtml(message)}</span><button type="button" aria-label="Dismiss notification">×</button>`;
  $("toastRegion").append(toast);
  const remove = () => toast.remove();
  toast.querySelector("button").addEventListener("click", remove);
  window.setTimeout(remove, 4500);
}

function setConnection(connected, message = "Connected to EventEase") {
  const status = $("connectionStatus");
  status.classList.toggle("connection-error", !connected);
  status.innerHTML = `<i class="status-dot"></i>${escapeHtml(message)}`;
}

function showSection(sectionId, options = {}) {
  const target = $(sectionId);
  if (!target?.classList.contains("section")) return;
  document.querySelectorAll(".section").forEach((section) => section.classList.toggle("active", section === target));
  document.querySelectorAll(".workspace-tabs [data-section]").forEach((button) => button.classList.toggle("active", button.dataset.section === sectionId));
  const labels = { dashboard: "Overview", events: "Explore events", "event-details": "Event details", registrations: "My registrations", "manage-events": "Manage events", students: "Students", organizers: "Organizers", participants: "Event participants" };
  $("workspaceTitle").textContent = labels[sectionId] || "EventEase";
  if (sectionId !== "participants" && sectionId !== "event-details") state.lastSection = sectionId;
  if (!options.keepScroll) $("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  if (sectionId === "registrations" && $("registrationStudent").value) loadStudentRegistrations($("registrationStudent").value);
}

function eventCard(event, compact = false) {
  const isOpen = event.registrationOpen === true;
  return `<article class="event-card ${compact ? "event-card-compact" : ""}">
    <div class="event-card-top"><span class="event-date">${escapeHtml(dateLabel(event.eventDate, { month: "short", day: "numeric" }))}</span><span class="status-pill ${isOpen ? "" : "status-closed"}">${isOpen ? "Registration open" : "Closed"}</span></div>
    <h3>${escapeHtml(event.title)}</h3><p class="event-detail-line"><span aria-hidden="true">⌖</span>${escapeHtml(event.venue)}</p>
    <p class="event-detail-line"><span aria-hidden="true">♧</span>${escapeHtml(event.organizer?.name || "Organizer not listed")}</p>
    <div class="event-card-bottom"><span>${escapeHtml(event.maxSeats ?? 0)} seats</span><div class="card-actions"><button class="text-button" data-action="view-event" data-id="${event.id}">Details</button><button class="button button-dark button-small" data-action="register" data-id="${event.id}" ${isOpen ? "" : "disabled"}>Register</button></div></div>
  </article>`;
}

function renderStats() {
  $("eventCount").textContent = state.events.length;
  $("openEventCount").textContent = state.events.filter((event) => event.registrationOpen === true).length;
  $("studentCount").textContent = state.students.length;
  $("organizerCount").textContent = state.organizers.length;
  $("registrationCount").textContent = state.registrations.length;
}

function sortEvents(events) {
  return [...events].sort((a, b) => (a.eventDate || "9999-12-31").localeCompare(b.eventDate || "9999-12-31"));
}

function renderEvents() {
  const all = sortEvents(state.visibleEvents);
  $("eventResultsMeta").textContent = `${all.length} ${all.length === 1 ? "event" : "events"} found`;
  $("eventsList").innerHTML = all.length ? all.map((event) => eventCard(event)).join("") : emptyPanel("No events match these filters. Try clearing them or create a new event.", "No events found");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sortEvents(state.events.filter((event) => !event.eventDate || event.eventDate >= today)).slice(0, 3);
  $("dashboardEvents").innerHTML = upcoming.length ? upcoming.map((event) => eventCard(event, true)).join("") : emptyPanel("There are no upcoming events right now. Check back soon.", "Campus is quiet for now");
}

function emptyPanel(message, title = "Nothing here yet") {
  return `<div class="empty-panel"><span class="empty-icon">✳</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
}

function renderActivity(registrations = state.registrations) {
  const recent = [...registrations].sort((a, b) => (b.registrationDate || "").localeCompare(a.registrationDate || "")).slice(0, 5);
  $("dashboardActivity").innerHTML = recent.length ? recent.map((item) => `<div class="activity-item"><span class="activity-icon">▤</span><div><strong>${escapeHtml(item.student?.name || "Student")} ${item.status === "CANCELLED" ? "cancelled a place at" : "registered for"} ${escapeHtml(item.event?.title || "an event")}</strong><small>${escapeHtml(dateTimeLabel(item.registrationDate))}</small></div><span class="status-pill ${item.status === "CANCELLED" ? "status-closed" : ""}">${escapeHtml(item.status)}</span></div>`).join("") : emptyPanel("Registration activity will appear here when students sign up.", "No activity yet");
}

function tableHtml(headers, rows, emptyMessage) {
  if (!rows.length) return emptyPanel(emptyMessage);
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function renderStudents() {
  $("studentsList").innerHTML = tableHtml(["Student", "Email", "Department", "Year", "Actions"], state.students.map((student) => `<tr><td><strong>${escapeHtml(student.name)}</strong></td><td>${escapeHtml(student.email)}</td><td>${escapeHtml(student.department)}</td><td>${escapeHtml(student.year)}</td><td><div class="row-actions"><button class="text-button" data-action="edit-student" data-id="${student.id}">Edit</button><button class="text-button danger-text" data-action="delete-student" data-id="${student.id}">Delete</button></div></td></tr>`), "Add students here to let them register for events.");
  const selected = $("registrationStudent").value || state.registrationStudentId;
  $("registrationStudent").innerHTML = `<option value="">Select a student</option>${state.students.map((student) => `<option value="${student.id}">${escapeHtml(student.name)} · ${escapeHtml(student.email)}</option>`).join("")}`;
  if (selected && state.students.some((student) => idValue(student.id) === idValue(selected))) $("registrationStudent").value = selected;
}

function renderOrganizers() {
  $("organizersList").innerHTML = tableHtml(["Organizer", "Email", "Department", "Actions"], state.organizers.map((organizer) => `<tr><td><strong>${escapeHtml(organizer.name)}</strong></td><td>${escapeHtml(organizer.email)}</td><td>${escapeHtml(organizer.department)}</td><td><div class="row-actions"><button class="text-button" data-action="edit-organizer" data-id="${organizer.id}">Edit</button><button class="text-button danger-text" data-action="delete-organizer" data-id="${organizer.id}">Delete</button></div></td></tr>`), "Add an organizer before creating an event.");
}

function renderManageEvents() {
  $("manageEventsList").innerHTML = tableHtml(["Event", "Date", "Venue", "Organizer", "Status", "Actions"], sortEvents(state.events).map((event) => `<tr><td><strong>${escapeHtml(event.title)}</strong><small class="table-subline">${escapeHtml(event.maxSeats)} seats</small></td><td>${escapeHtml(dateLabel(event.eventDate))}</td><td>${escapeHtml(event.venue)}</td><td>${escapeHtml(event.organizer?.name || "—")}</td><td><span class="status-pill ${event.registrationOpen ? "" : "status-closed"}">${event.registrationOpen ? "Open" : "Closed"}</span></td><td><div class="row-actions"><button class="text-button" data-action="view-event" data-id="${event.id}">View</button><button class="text-button" data-action="edit-event" data-id="${event.id}">Edit</button><button class="text-button danger-text" data-action="delete-event" data-id="${event.id}">Delete</button></div></td></tr>`), "Create an event to see it here.");
}

function renderRegistrations(registrations) {
  if (!registrations.length) {
    $("studentRegistrations").innerHTML = emptyPanel("This student has no registrations yet. Browse events to find one.", "No registrations yet");
    return;
  }
  const sorted = [...registrations].sort((a, b) => (b.registrationDate || "").localeCompare(a.registrationDate || ""));
  $("studentRegistrations").innerHTML = sorted.map((registration) => {
    const event = registration.event || {};
    const studentId = registration.student?.id || state.registrationStudentId;
    const isRegistered = registration.status === "REGISTERED";
    const eventDate = event.eventDate ? new Date(`${event.eventDate}T12:00:00`) : null;
    const day = eventDate ? eventDate.getDate() : "—";
    const month = eventDate ? eventDate.toLocaleDateString(undefined, { month: "short" }).toUpperCase() : "TBA";
    return `<article class="registration-card"><div class="registration-date-block"><strong>${escapeHtml(day)}</strong><span>${escapeHtml(month)}</span></div><div class="registration-info"><span class="eyebrow">${escapeHtml(event.venue || "Campus event")}</span><h3>${escapeHtml(event.title || "Event")}</h3><p>Registered ${escapeHtml(dateTimeLabel(registration.registrationDate))}</p><span class="status-pill ${isRegistered ? "" : "status-closed"}">${escapeHtml(registration.status)}</span></div><div class="registration-actions"><button class="text-button" data-action="view-event" data-id="${event.id}">View event</button>${isRegistered ? `<button class="button button-outline button-small" data-action="cancel-registration" data-event-id="${event.id}" data-student-id="${studentId}">Cancel</button>` : ""}</div></article>`;
  }).join("");
}

async function loadStudentRegistrations(studentId) {
  state.registrationStudentId = studentId;
  if (!studentId) {
    $("studentRegistrations").innerHTML = '<div class="empty-panel">Select a student above to see their registrations.</div>';
    return;
  }
  $("studentRegistrations").innerHTML = loadingPanel("Loading registrations…");
  try { renderRegistrations(await api.getStudentRegistrations(studentId)); }
  catch (error) { $("studentRegistrations").innerHTML = errorPanel(error.message, () => loadStudentRegistrations(studentId)); }
}

function loadingPanel(message) { return `<div class="loading-panel"><span class="spinner"></span>${escapeHtml(message)}</div>`; }
function errorPanel(message, retry) {
  const retryId = `retry-${++retrySequence}`;
  if (retry) retryActions.set(retryId, retry);
  return `<div class="empty-panel error-panel"><strong>We couldn’t load this section</strong><p>${escapeHtml(message)}</p>${retry ? `<button class="button button-outline button-small" type="button" data-action="retry" data-retry-id="${retryId}">Try again</button>` : ""}</div>`;
}

async function loadEvents(filters = {}, announceError = true) {
  $("eventsList").innerHTML = `${loadingPanel("Loading events…")}`;
  $("eventResultsMeta").textContent = "";
  try {
    const returned = await api.getEvents(filters);
    // The existing controller applies only one server filter per request.
    // Apply any additional filters in the UI so combinations still work.
    let matches = returned;
    if (filters.title) matches = matches.filter((event) => event.title?.toLowerCase().includes(filters.title.toLowerCase()));
    if (filters.date) matches = matches.filter((event) => event.eventDate === filters.date);
    if (filters.open) matches = matches.filter((event) => event.registrationOpen === true);
    state.visibleEvents = matches;
    renderEvents();
  } catch (error) {
    $("eventResultsMeta").textContent = "";
    $("eventsList").innerHTML = errorPanel(error.message, () => loadEvents(filters));
    if (announceError) setConnection(false, "Server unavailable");
  }
}

async function loadEventDetails(id) {
  showSection("event-details");
  $("eventDetailsContent").innerHTML = loadingPanel("Loading event details…");
  try {
    const [event, participants] = await Promise.all([api.getEvent(id), api.getEventParticipants(id)]);
    state.currentEvent = event;
    const participantPreview = participants.slice(0, 4).map((item) => `<span class="participant-avatar" title="${escapeHtml(item.student?.name)}">${escapeHtml((item.student?.name || "?").slice(0, 1).toUpperCase())}</span>`).join("");
    $("eventDetailsContent").innerHTML = `<article class="details-card"><div class="details-cover"><span class="eyebrow">EVENTEASE CAMPUS EVENT</span><span class="status-pill ${event.registrationOpen ? "" : "status-closed"}">${event.registrationOpen ? "Registration open" : "Registration closed"}</span></div><div class="details-body"><div><span class="eyebrow">${escapeHtml(dateLabel(event.eventDate))}</span><h2>${escapeHtml(event.title)}</h2><div class="details-facts"><div><span>Date</span><strong>${escapeHtml(dateLabel(event.eventDate))}</strong></div><div><span>Venue</span><strong>${escapeHtml(event.venue)}</strong></div><div><span>Organizer</span><strong>${escapeHtml(event.organizer?.name || "—")}</strong></div><div><span>Capacity</span><strong>${escapeHtml(event.maxSeats)} seats</strong></div></div><div class="participant-preview"><div class="participant-avatars">${participantPreview || ""}</div><span>${participants.length} ${participants.length === 1 ? "participant" : "participants"}</span><button class="text-button" data-action="show-participants" data-id="${event.id}">View list →</button></div></div><aside class="details-register"><span class="eyebrow">SAVE YOUR SPOT</span><strong>${event.registrationOpen ? "Join the event" : "Registration is closed"}</strong><p>${event.registrationOpen ? `${participants.length} registered · ${Math.max(0, Number(event.maxSeats) - participants.length)} seats available` : "This event is not accepting registrations right now."}</p><button class="button button-dark" data-action="register" data-id="${event.id}" ${event.registrationOpen ? "" : "disabled"}>Register for free</button></aside></div></article>`;
  } catch (error) { $("eventDetailsContent").innerHTML = errorPanel(error.message, () => loadEventDetails(id)); }
}

async function loadParticipants(eventId) {
  showSection("participants");
  $("participantsTitle").textContent = "Event participants";
  $("participantCount").textContent = "";
  $("participantsList").innerHTML = loadingPanel("Loading participants…");
  try {
    const event = state.currentEvent?.id === Number(eventId) ? state.currentEvent : await api.getEvent(eventId);
    $("participantsTitle").textContent = `${event.title} participants`;
    const participants = await api.getEventParticipants(eventId);
    $("participantCount").textContent = `${participants.length} registered ${participants.length === 1 ? "participant" : "participants"}`;
    $("participantsList").innerHTML = tableHtml(["Student", "Email", "Department", "Year", "Registered", "Status"], participants.map((registration) => `<tr><td><strong>${escapeHtml(registration.student?.name)}</strong></td><td>${escapeHtml(registration.student?.email)}</td><td>${escapeHtml(registration.student?.department)}</td><td>${escapeHtml(registration.student?.year)}</td><td>${escapeHtml(dateTimeLabel(registration.registrationDate))}</td><td><span class="status-pill">${escapeHtml(registration.status)}</span></td></tr>`), "No participants registered yet.");
  } catch (error) { $("participantsList").innerHTML = errorPanel(error.message, () => loadParticipants(eventId)); }
}

async function refreshDashboard() {
  $("dashboardEvents").innerHTML = loadingPanel("Loading upcoming events…");
  $("dashboardActivity").innerHTML = loadingPanel("Loading registration activity…");
  const requests = await Promise.allSettled([api.getEvents(), api.getStudents(), api.getOrganizers(), api.getRegistrations()]);
  const [events, students, organizers, registrations] = requests;
  if (events.status === "fulfilled") { state.events = events.value; state.visibleEvents = events.value; renderEvents(); }
  if (students.status === "fulfilled") state.students = students.value;
  if (organizers.status === "fulfilled") state.organizers = organizers.value;
  if (registrations.status === "fulfilled") state.registrations = registrations.value;
  renderStudents(); renderOrganizers(); renderManageEvents(); renderStats(); renderActivity();
  const failure = requests.find((result) => result.status === "rejected");
  if (failure) {
    setConnection(false, "Server unavailable");
    const message = failure.reason?.message || "Unable to connect to EventEase. Make sure Spring Boot is running on port 8081.";
    if (events.status === "rejected") $("dashboardEvents").innerHTML = errorPanel(message, refreshDashboard);
    if (registrations.status === "rejected") $("dashboardActivity").innerHTML = errorPanel(message, refreshDashboard);
    notify(message, "error");
  } else setConnection(true);
}

function formField(label, name, type = "text", value = "", required = true, extra = "", attrs = "") {
  return `<div class="form-group ${extra}"><label for="field-${name}">${label}${required ? " <span>*</span>" : ""}</label><input id="field-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""} ${attrs}></div>`;
}

function openForm(kind, record = null) {
  const isEdit = Boolean(record);
  const titles = {
    student: isEdit ? "Edit student" : "Add a student",
    organizer: isEdit ? "Edit organizer" : "Add an organizer",
    event: isEdit ? "Edit event" : "Create an event",
    register: "Choose a student"
  };
  $("modalTitle").textContent = titles[kind];
  $("modalSubmit").textContent = kind === "register" ? "Confirm registration" : (isEdit ? "Save changes" : "Save");
  $("modalForm").dataset.kind = kind;
  $("modalForm").dataset.recordId = record?.id || "";
  $("modalBody").classList.remove("modal-loading");
  if (kind === "student") {
    $("modalBody").innerHTML = `<div class="form-grid">${formField("Full name", "name", "text", record?.name || "", true)}${formField("Email address", "email", "email", record?.email || "", true)}${formField("Department", "department", "text", record?.department || "", true)}${formField("Year", "year", "number", record?.year || "", true, "", 'min="1" max="8" step="1"')}</div>`;
  } else if (kind === "organizer") {
    $("modalBody").innerHTML = `<div class="form-grid">${formField("Full name", "name", "text", record?.name || "", true)}${formField("Email address", "email", "email", record?.email || "", true)}${formField("Department", "department", "text", record?.department || "", true, "full")}</div>`;
  } else if (kind === "event") {
    const organizerSelect = isEdit ? `<div class="form-group"><label>Organizer</label><div class="locked-field">${escapeHtml(record.organizer?.name || "Organizer assigned")}</div><small>The existing API doesn’t change an event’s organizer.</small></div>` : `<div class="form-group"><label for="field-organizerId">Organizer <span>*</span></label><select id="field-organizerId" name="organizerId" required><option value="">Choose an organizer</option>${state.organizers.map((organizer) => `<option value="${organizer.id}">${escapeHtml(organizer.name)} · ${escapeHtml(organizer.department)}</option>`).join("")}</select></div>`;
    $("modalBody").innerHTML = `<div class="form-grid">${formField("Event title", "title", "text", record?.title || "", true, "full")}${formField("Event date", "eventDate", "date", record?.eventDate || "", true)}${formField("Maximum seats", "maxSeats", "number", record?.maxSeats || "", true, "", 'min="1" step="1"')}${formField("Venue", "venue", "text", record?.venue || "", true, "full")}${organizerSelect}</div>${isEdit ? "<p class='form-note'>Registration availability is managed by the backend as event capacity changes.</p>" : "<p class='form-note'>New events open registration automatically. The API assigns the organizer from the Organizer field.</p>"}`;
  } else {
    if (!state.students.length) {
      $("modalBody").innerHTML = `<div class="empty-panel"><strong>No student profiles yet</strong><p>Add a student profile before registering for this event.</p><button class="button button-orange" type="button" data-action="create-student">＋ Add a student</button></div>`;
      $("modalSubmit").hidden = true;
    } else {
      $("modalSubmit").hidden = false;
      $("modalBody").innerHTML = `<p class="modal-intro">Registering for <strong>${escapeHtml(state.currentEvent?.title || "this event")}</strong>. Select the student who will attend.</p><div class="form-group"><label for="field-studentId">Student <span>*</span></label><select id="field-studentId" name="studentId" required><option value="">Choose a student</option>${state.students.map((student) => `<option value="${student.id}">${escapeHtml(student.name)} · ${escapeHtml(student.email)}</option>`).join("")}</select></div>`;
    }
  }
  if (kind !== "register") $("modalSubmit").hidden = false;
  $("modal").showModal();
}

function closeModal() { $("modal").close(); }

async function submitModal(form) {
  if (!form.reportValidity()) return;
  const submit = $("modalSubmit");
  const originalLabel = submit.textContent;
  submit.disabled = true; submit.textContent = "Saving…";
  const data = Object.fromEntries(new FormData(form));
  const kind = form.dataset.kind;
  const id = form.dataset.recordId;
  try {
    if (kind === "student") {
      data.year = Number(data.year);
      if (id) await api.updateStudent(id, data); else await api.createStudent(data);
      notify(id ? "Student updated successfully." : "Student added successfully.");
    } else if (kind === "organizer") {
      if (id) await api.updateOrganizer(id, data); else await api.createOrganizer(data);
      notify(id ? "Organizer updated successfully." : "Organizer added successfully.");
    } else if (kind === "event") {
      const organizerId = data.organizerId;
      delete data.organizerId;
      data.maxSeats = Number(data.maxSeats);
      if (id) await api.updateEvent(id, data);
      else await api.createEvent(organizerId, { ...data, registrationOpen: true });
      notify(id ? "Event updated successfully." : "Event created successfully.");
    } else if (kind === "register") {
      await api.registerStudent(state.currentEvent.id, data.studentId);
      state.registrationStudentId = data.studentId;
      $("registrationStudent").value = data.studentId;
      notify("Registration successful.");
    }
    closeModal();
    await refreshDashboard();
    if (kind === "register") {
      await Promise.all([loadStudentRegistrations(data.studentId), loadEventDetails(state.currentEvent.id)]);
      showSection("event-details", { keepScroll: true });
    }
    if (kind === "event" && !id) await loadEvents(readFilters());
  } catch (error) {
    notify(error.message || "The change could not be saved.", "error");
  } finally {
    submit.disabled = false; submit.textContent = originalLabel;
  }
}

function readFilters() {
  return {
    title: $("eventSearch").value.trim(),
    date: $("eventDateFilter").value,
    open: $("eventOpenFilter").value === "open"
  };
}

async function applyFilters() {
  const filters = readFilters();
  await loadEvents(filters);
}

async function handleAction(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;
  try {
    if (action === "view-event") { await loadEventDetails(id); return; }
    if (action === "show-participants") { await loadParticipants(id); return; }
    if (action === "retry") { retryActions.get(button.dataset.retryId)?.(); return; }
    if (action === "register") {
      state.currentEvent = await api.getEvent(id);
      if (!state.currentEvent.registrationOpen) { notify("Registration is closed for this event.", "error"); return; }
      openForm("register"); return;
    }
    if (action === "create-event") {
      if (!state.organizers.length) await refreshDashboard();
      if (!state.organizers.length) { showSection("organizers"); notify("Add an organizer before creating an event.", "error"); return; }
      openForm("event"); return;
    }
    if (action === "create-student") {
      if ($("modal").open) closeModal();
      openForm("student"); return;
    }
    if (action === "create-organizer") { openForm("organizer"); return; }
    if (action === "edit-student") { openForm("student", state.students.find((item) => idValue(item.id) === idValue(id))); return; }
    if (action === "edit-organizer") { openForm("organizer", state.organizers.find((item) => idValue(item.id) === idValue(id))); return; }
    if (action === "edit-event") { openForm("event", state.events.find((item) => idValue(item.id) === idValue(id))); return; }
    if (action === "delete-student") {
      const student = state.students.find((item) => idValue(item.id) === idValue(id));
      if (!window.confirm(`Delete ${student?.name || "this student"}?`)) return;
      await api.deleteStudent(id); notify("Student deleted successfully.");
    }
    if (action === "delete-organizer") {
      const organizer = state.organizers.find((item) => idValue(item.id) === idValue(id));
      if (!window.confirm(`Delete ${organizer?.name || "this organizer"}?`)) return;
      await api.deleteOrganizer(id); notify("Organizer deleted successfully.");
    }
    if (action === "delete-event") {
      const event = state.events.find((item) => idValue(item.id) === idValue(id));
      if (!window.confirm(`Delete “${event?.title || "this event"}”? This may also be blocked if it has registrations.`)) return;
      await api.deleteEvent(id); notify("Event deleted successfully.");
    }
    if (action === "cancel-registration") {
      const event = state.registrations.find((item) => idValue(item.event?.id) === idValue(button.dataset.eventId) && idValue(item.student?.id) === idValue(button.dataset.studentId))?.event;
      if (!window.confirm(`Cancel your registration for “${event?.title || "this event"}”?`)) return;
      await api.cancelRegistration(button.dataset.eventId, button.dataset.studentId);
      notify("Registration cancelled.");
      await refreshDashboard();
      await loadStudentRegistrations(button.dataset.studentId);
    }
    await refreshDashboard();
    if (action.startsWith("delete-") || action.startsWith("edit-")) {
      if (state.lastSection === "events") await loadEvents(readFilters());
    }
  } catch (error) { notify(error.message || "Unable to complete this action.", "error"); }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-section], [data-view], [data-action]");
  if (!target) return;
  if (target.dataset.section) showSection(target.dataset.section);
  if (target.dataset.view) showSection(target.dataset.view);
  if (target.dataset.action === "close-modal") closeModal();
  if (target.dataset.action && target.dataset.action !== "close-modal") handleAction(target);
});

$("modalForm").addEventListener("submit", (event) => { event.preventDefault(); submitModal(event.currentTarget); });
$("filtersForm").addEventListener("submit", (event) => { event.preventDefault(); applyFilters(); });
$("clearFilters").addEventListener("click", () => {
  $("eventSearch").value = ""; $("eventDateFilter").value = ""; $("eventOpenFilter").value = "all"; applyFilters();
});
$("eventDateFilter").addEventListener("change", applyFilters);
$("eventOpenFilter").addEventListener("change", applyFilters);
$("registrationStudent").addEventListener("change", (event) => loadStudentRegistrations(event.target.value));
$("refreshRegistrations").addEventListener("click", () => loadStudentRegistrations($("registrationStudent").value));
$("headerSearch").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("eventSearch").value = $("headerSearchInput").value;
  showSection("events");
  await applyFilters();
});
$("mobileMenu").addEventListener("click", () => {
  const opened = $("topNav").classList.toggle("menu-open");
  $("mobileMenu").setAttribute("aria-expanded", String(opened));
});

refreshDashboard();
loadEvents();
