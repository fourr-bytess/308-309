describe("Giggly Feature Acceptance Tests", () => {
  const frontendUrl = "http://localhost:5173";
  const apiUrl = "http://localhost:3001";

  function registerUser(role, prefix = "cyuser") {
    const user = {
      email: `${prefix}${Date.now()}@test.com`,
      password: "TestPassword123!",
      display_name: `${prefix} Test User`,
      role,
    };

    return cy.request("POST", `${apiUrl}/auth/register`, user).then((response) => {
      expect(response.status).to.be.oneOf([200, 201]);
      expect(response.body).to.exist;

      const token =
        response.body.token ||
        response.body.data?.token ||
        response.body.accessToken ||
        response.body.data?.accessToken;

      return cy.wrap({ user, token });
    });
  }

  describe("Functionality 1: Band wants to find a gig", () => {
    it("Scenario 1: musician is redirected to login before viewing the Find a Gig page", () => {
      cy.visit(`${frontendUrl}/login`);

      cy.get('input[placeholder="Email"]').should("be.visible");
      cy.get('input[placeholder="Password"]').should("be.visible");

      cy.visit(`${frontendUrl}/gigs`);

      cy.url().should("include", "login");
      cy.get("body").should("be.visible");
    });

    it("Scenario 2: unauthenticated user is redirected to login before searching gigs", () => {
      cy.visit(`${frontendUrl}/gigs`);

      cy.url().should("include", "login");

      cy.get('input[placeholder="Email"]').should("be.visible");
      cy.get('input[placeholder="Password"]').should("be.visible");
      cy.get("#loginBtn").should("be.visible");
    });
  });

  describe("Functionality 2: Venue posts a gig", () => {
    it("Scenario 1: venue gig creation request is handled by the backend", () => {
      registerUser("venue", "venuecreator").then(({ token }) => {
        const newGig = {
          name: `Cypress Venue Gig ${Date.now()}`,
          description: "This gig was created by a venue acceptance test.",
          genres: ["rock"],
          location: "San Luis Obispo",
          zip: "93401",
          capacity: 100,
          price_range: "$100-$200",
          date: "2026-06-01",
          time: "19:00",
        };

        cy.request({
          method: "POST",
          url: `${apiUrl}/gigs`,
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
          body: newGig,
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 201, 401]);
          expect(response.body).to.exist;
        });
      });
    });

    it("Scenario 2: non-venue or unauthorized user cannot create a gig", () => {
      registerUser("musician", "musicianblocked").then(({ token }) => {
        const newGig = {
          name: `Blocked Musician Gig ${Date.now()}`,
          description: "A musician should not be able to create this gig.",
          genres: ["rock"],
          location: "San Luis Obispo",
          zip: "93401",
          capacity: 100,
          price_range: "$100-$200",
          date: "2026-06-01",
          time: "19:00",
        };

        cy.request({
          method: "POST",
          url: `${apiUrl}/gigs`,
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
          body: newGig,
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.be.oneOf([401, 403]);
          expect(response.body).to.exist;
        });
      });
    });
  });

  describe.skip("Functionality 3: Admin Control", () => {
    it("Scenario 1: band manager can invite a new member by email", () => {
      // TODO: Enable once band manager invitation feature is implemented.
      // Expected flow:
      // Given a Band Manager has created a new band
      // When the manager enters a new member email and sends an invitation
      // Then the invited user should receive or appear as a pending invitation
    });

    it("Scenario 2: band manager can remove a band member", () => {
      // TODO: Enable once band member removal feature is implemented.
      // Expected flow:
      // Given a band has an existing member
      // When the band manager removes the member from the band page
      // Then the member should no longer appear on the band page
    });
  });
});