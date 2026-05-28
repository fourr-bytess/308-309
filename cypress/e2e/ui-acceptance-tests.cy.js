describe("Giggly Acceptance Tests", () => {
  const frontendUrl = "http://localhost:5173";
  const apiUrl = "http://localhost:3001";

  describe("E2E UI Tests", () => {
    it("E2E test: loads the Giggly frontend", () => {
      cy.visit(frontendUrl);

      cy.contains("Giggly").should("be.visible");
    });

    it("E2E test: unauthenticated user is redirected to login when viewing bands", () => {
      cy.intercept("GET", `${apiUrl}/bands`).as("getBands");

      cy.visit(`${frontendUrl}/bands`);

      cy.wait("@getBands")
        .its("response.statusCode")
        .then((statusCode) => {
          expect(statusCode).to.be.oneOf([200, 304]);
        });

      cy.url().should("include", "login");
      cy.get("body").should("be.visible");
    });

    it("E2E test: login page displays required login fields", () => {
      cy.visit(`${frontendUrl}/login`);

      cy.get('input[placeholder="Email"]').should("be.visible");
      cy.get('input[placeholder="Password"]').should("be.visible");
      cy.get("#loginBtn").should("be.visible").and("not.be.disabled");
    });

    it("E2E test: unauthenticated user is redirected to login when viewing gigs", () => {
      cy.visit(`${frontendUrl}/gigs`);

      cy.url().should("include", "login");

      cy.get('input[placeholder="Email"]').should("be.visible");
      cy.get('input[placeholder="Password"]').should("be.visible");
      cy.get("#loginBtn").should("be.visible");
    });

    it("E2E test: user can type into the login form fields", () => {
      cy.visit(`${frontendUrl}/login`);

      cy.get('input[placeholder="Email"]')
        .should("be.visible")
        .clear()
        .type("cypresstest@example.com")
        .should("have.value", "cypresstest@example.com");

      cy.get('input[placeholder="Password"]')
        .should("be.visible")
        .clear()
        .type("TestPassword123!")
        .should("have.value", "TestPassword123!");

      cy.get("#loginBtn").should("be.visible").and("not.be.disabled");
    });
  });
});