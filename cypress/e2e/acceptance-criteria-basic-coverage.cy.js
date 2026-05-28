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
  });

  describe("API Tests", () => {
    it("API GET test: gets gigs from the backend", () => {
      cy.request("GET", `${apiUrl}/gigs`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.exist;
      });
    });

    it("API POST test: registers a new user through the backend", () => {
      const testUser = {
        email: `cypressuser${Date.now()}@test.com`,
        password: "TestPassword123!",
        display_name: "Cypress Test User",
        role: "venue",
      };

      cy.request("POST", `${apiUrl}/auth/register`, testUser).then((response) => {
        expect(response.status).to.be.oneOf([200, 201]);
        expect(response.body).to.exist;
      });
    });

    it("API negative test: rejects duplicate user registration", () => {
      const testUser = {
        email: `duplicate${Date.now()}@test.com`,
        password: "TestPassword123!",
        display_name: "Duplicate Test User",
        role: "venue",
      };

      cy.request("POST", `${apiUrl}/auth/register`, testUser).then((firstResponse) => {
        expect(firstResponse.status).to.be.oneOf([200, 201]);

        cy.request({
          method: "POST",
          url: `${apiUrl}/auth/register`,
          body: testUser,
          failOnStatusCode: false,
        }).then((secondResponse) => {
          expect(secondResponse.status).to.be.oneOf([400, 409]);
          expect(secondResponse.body).to.exist;
        });
      });
    });
  });
});