import { AvailabilityService } from "./availability.service.js";

describe("AvailabilityService", () => {
  it("returns slots on the configured weekday and none on the next day", async () => {
    const tenantId = "tenant-1";
    const serviceId = "service-1";
    const professionalId = "professional-1";

    const repository = {
      getTenantTimezone: jest.fn().mockResolvedValue("UTC"),
      getContext: jest.fn().mockResolvedValue({
        tenant: {
          id: tenantId,
          timezone: "UTC",
          status: "published",
          maxDailyAppointments: 20,
          minimumBookingNoticeHours: 0
        },
        service: {
          id: serviceId,
          tenantId,
          duration: 30,
          status: "active"
        },
        businessHours: [
          { tenantId, dayOfWeek: 1, startTime: "09:00:00", endTime: "10:00:00" }
        ],
        professionals: [
          { id: professionalId, tenantId, name: "Profesional", status: "active" }
        ],
        appointments: [],
        blockedTimes: [],
        dailyAppointments: 0
      })
    } as unknown as ConstructorParameters<typeof AvailabilityService>[0];

    const service = new AvailabilityService(repository);

    const monday = await service.getAvailability({
      tenantId, serviceId, date: "2099-01-05", professionalId
    });

    const tuesday = await service.getAvailability({
      tenantId, serviceId, date: "2099-01-06", professionalId
    });

    expect(monday.length).toBeGreaterThan(0);
    expect(tuesday).toEqual([]);
  });
});
