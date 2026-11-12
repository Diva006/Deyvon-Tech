const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".navigation");

function closeNavigation() {
  menuButton.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

menuButton.addEventListener("click", () => {
  const isExpanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isExpanded));
  navigation.classList.toggle("is-open", !isExpanded);
  document.body.classList.toggle("menu-open", !isExpanded);
});

navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeNavigation();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    closeNavigation();
    menuButton.focus();
  }
});

document.querySelector("#year").textContent = String(new Date().getFullYear());

const form = document.querySelector("#contact-form");
const status = document.querySelector("#form-status");
const submitButton = form.querySelector('button[type="submit"]');

form.addEventListener("input", (event) => {
  event.target.removeAttribute("aria-invalid");
  if (status.dataset.state === "error") {
    status.textContent = "";
    delete status.dataset.state;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const inquiry = Object.fromEntries(formData.entries());
  const requiredFields = ["name", "email", "service", "message"];
  let firstInvalidField;

  for (const fieldName of requiredFields) {
    const field = form.elements.namedItem(fieldName);
    if (!field.value.trim() || !field.checkValidity()) {
      field.setAttribute("aria-invalid", "true");
      firstInvalidField ??= field;
    }
  }

  if (firstInvalidField) {
    status.textContent = "Please check the required fields and try again.";
    status.dataset.state = "error";
    firstInvalidField.focus();
    return;
  }

  status.textContent = "";
  delete status.dataset.state;
  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");

  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inquiry),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "We couldn't send your inquiry. Please try again.");
    }

    status.textContent = result.message;
    status.dataset.state = "success";
    form.reset();
  } catch (error) {
    status.textContent = error instanceof Error
      ? error.message
      : "Something went wrong. Please email deyvontech@gmail.com instead.";
    status.dataset.state = "error";
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
  }
});
