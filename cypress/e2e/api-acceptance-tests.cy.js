describe("Giggly Acceptance Tests", () => {
  const frontendUrl = "http://localhost:5173";
  const apiUrl = "http://localhost:3001";

  describe("API Tests", () => {
    it("API GET test: gets gigs from the backend", () => {
      cy.request("GET", `${apiUrl}/gigs`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.exist;
      });
    });

    it("API GET test: gets bands from the backend", () => {
      cy.request("GET", `${apiUrl}/bands`).then((response) => {
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

    it("API negative test: rejects registration with missing required fields", () => {
      const invalidUser = {
        email: `invaliduser${Date.now()}@test.com`,
        role: "venue",
      };

      cy.request({
        method: "POST",
        url: `${apiUrl}/auth/register`,
        body: invalidUser,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 422]);
        expect(response.body).to.exist;
      });
    });
  });
});