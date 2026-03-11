import { NextResponse } from "next/server";

export const revalidate = 900;

interface ServiceDeskTicket {
  id: string;
  technician?: { name: string };
  created_time: { display_value: string; value: string };
  status: { name: string };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthName = searchParams.get("month");
    const year = searchParams.get("year");

    const monthToNumber: Record<string, string> = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };

    const month = monthName ? monthToNumber[monthName] : null;
    if (!month || !year) return new NextResponse("error");

    // Fetch tickets from first 5 pages (500 tickets)
    const allTickets: ServiceDeskTicket[] = [];
    for (let page = 1; page <= 5; page++) {
      const response = await fetch(
        `${process.env.SERVICEDESK_API_URL}/api/v3/requests?input_data=${encodeURIComponent(JSON.stringify({ list_info: { row_count: 100, page } }))}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authtoken: process.env.SERVICEDESK_API_KEY!,
          },
        },
      );

      if (!response.ok) return new NextResponse("error");

      const data = await response.json();
      if (data.requests?.length) {
        allTickets.push(...data.requests);
      } else {
        break;
      }
    }

    // Filter tickets
    const targetTechnicians = ["Wojciech Bawirsz", "Adrian Antosiak"];
    const filteredTickets = allTickets.filter((ticket) => {
      if (
        !ticket.technician?.name ||
        !targetTechnicians.includes(ticket.technician.name)
      )
        return false;
      if (!ticket.created_time?.display_value) return false;

      const [, ticketMonth, ticketYear] = ticket.created_time.display_value
        .split(" ")[0]
        .split(".");
      return ticketMonth === month.padStart(2, "0") && ticketYear === year;
    });

    if (filteredTickets.length === 0) return new NextResponse("0");

    // Calculate 24h resolution
    let closedTickets = 0;
    let closedWithin24h = 0;

    for (const ticket of filteredTickets) {
      if (ticket.status.name === "Closed") {
        closedTickets++;

        try {
          const detailResponse = await fetch(
            `${process.env.SERVICEDESK_API_URL}/api/v3/requests/${ticket.id}`,
            { headers: { Authtoken: process.env.SERVICEDESK_API_KEY! } },
          );

          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            const resolvedTime =
              detail.request?.resolved_time || detail.request?.completed_time;

            if (resolvedTime) {
              const completionMinutes =
                (parseInt(resolvedTime.value) -
                  parseInt(ticket.created_time.value)) /
                (1000 * 60);
              if (completionMinutes <= 24 * 60) closedWithin24h++;
            }
          }
        } catch {}
      }
    }

    const percentage =
      closedTickets > 0
        ? Math.round((closedWithin24h / closedTickets) * 100)
        : 0;
    return new NextResponse(percentage.toString());
  } catch {
    return new NextResponse("error");
  }
}
