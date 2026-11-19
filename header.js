const reportMenu = document.querySelector("#report-menu");
const openReportButton = document.querySelector("#open-report");

if (reportMenu && openReportButton) {
  const updateReportButton = () => {
    openReportButton.disabled = !reportMenu.value;
  };

  const openSelectedReport = () => {
    if (!reportMenu.value) return;
    const destination = new URL(reportMenu.value, window.location.href);
    const currentPath = window.location.pathname.replace(/\/$/, "/index.html");
    const destinationPath = destination.pathname.replace(/\/$/, "/index.html");

    if (currentPath === destinationPath && destination.hash === "#polygon-report" && window.__app?.openPolygonReport) {
      window.__app.openPolygonReport();
      return;
    }

    if (currentPath === destinationPath && destination.hash === "#triage" && window.__app?.openTriageWorkflow) {
      window.__app.openTriageWorkflow();
      return;
    }

    if (currentPath === destinationPath && destination.hash === "#workflow-audit" && window.__app?.openWorkflowAuditReport) {
      window.__app.openWorkflowAuditReport();
      return;
    }

    if (currentPath === destinationPath && destination.hash) {
      const panelId = destination.hash.slice(1);
      const tab = [...document.querySelectorAll("[role='tab'][aria-controls]")]
        .find((candidate) => candidate.getAttribute("aria-controls") === panelId);
      if (tab && window.__app?.setTab) {
        window.__app.setTab(tab.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
        history.replaceState({}, document.title, destination.hash);
        return;
      }
    }

    window.location.assign(destination.href);
  };

  reportMenu.addEventListener("change", updateReportButton);
  reportMenu.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && reportMenu.value) openSelectedReport();
  });
  openReportButton.addEventListener("click", openSelectedReport);
  updateReportButton();
}
