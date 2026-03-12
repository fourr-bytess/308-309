import { expect, jest } from '@jest/globals';
import venueModel from "./venue.js";
import venueServices from "./venue-services.js";

describe("Venue Model and Functions Test Suite", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        venueModel.find = jest.fn();
        venueModel.findById = jest.fn();
        venueModel.findByIdAndDelete = jest.fn();
        jest.spyOn(venueModel.prototype, 'save').mockReturnThis();
    });

    describe("getVenue", () => {
        test("Testing filters -- success", async () => {
            const mockSelect = jest.fn().mockResolvedValue([]);
            venueModel.find.mockReturnValue({ select: mockSelect });

            await venueServices.getVenue(
                "The Venue",
                "San Luis Obispo",
                "California",
                "93401",
                [200, 500]
            );

            expect(venueModel.find).toHaveBeenCalledWith(expect.objectContaining({
                name: "the venue",
                city: "san luis obispo",
                state: "california",
                zip: "93401",
                capacity: { $gte: 200, $lte: 500 }
            }));
        });

        test("Testing some empty filters -- success", async () => {
            venueModel.find.mockResolvedValue([]);
            await venueServices.getVenue(null, null, null, null, [100]);
            expect(venueModel.find).toHaveBeenCalledWith({});
        });
    });

    describe("addVenue", () => {
        test("Testing addVenue -- success", async () => {
            const venueData = {
                name: "The Venue",
                address: "123 San Francisco St",
                city: "San Francisco",
                state: "California",
                zip: "94102",
                capacity: 340,
                contact_email: "venue@gmail.com",
                description: "Big room with stage."
            };

            venueModel.prototype.save = jest.fn().mockResolvedValue(venueData);
            const result = await venueServices.addVenue(venueData);
            expect(result).toEqual(venueData);
            expect(venueModel.prototype.save).toHaveBeenCalled();
        });
    });

    describe("get Id and delete", () => {
        test("Testing findVenueById -- success", async () => {
            venueModel.findById.mockResolvedValue({ name: "true"});
            const result = await venueServices.findVenueById("111");
            expect(result.name).toBe("true");
            expect(venueModel.findById).toHaveBeenCalledWith("111");
        });
        test("Testing findVenueByIdAndDelete -- success", async () => {
            venueModel.findByIdAndDelete = jest.fn().mockResolvedValue(true);
            await venueServices.findVenueByIdAndDelete("111");
            expect(venueModel.findByIdAndDelete).toHaveBeenCalledWith("111");
        });
    });
});