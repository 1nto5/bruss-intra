export const revalidate = 3600;

import { NextRequest, NextResponse } from "next/server";
import { dbc } from "@/lib/db/mongo";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const department = searchParams.get("department");
    const search = searchParams.get("search");
    const manager = searchParams.get("manager");
    const email = searchParams.get("email");
    const identifier = searchParams.get("identifier");

    const coll = await dbc("employees");

    // Single employee lookup by identifier
    if (identifier) {
      const employee = await coll.findOne({ identifier });
      return NextResponse.json(employee);
    }

    // Single employee lookup by email
    if (email) {
      const emailLower = email.toLowerCase();

      // Try direct email field match first
      let employee = await coll.findOne({ email: emailLower });

      // Fallback: parse LDAP-style email (firstname.lastname@domain) into name match
      if (!employee && emailLower.includes("@")) {
        const localPart = emailLower.split("@")[0];
        const nameParts = localPart.split(".");
        if (nameParts.length >= 2) {
          const [first, ...rest] = nameParts;
          const last = rest.join(" ");
          employee = await coll.findOne({
            $or: [
              {
                firstName: { $regex: `^${first}$`, $options: "i" },
                lastName: { $regex: `^${last}$`, $options: "i" },
              },
              {
                firstName: { $regex: `^${last}$`, $options: "i" },
                lastName: { $regex: `^${first}$`, $options: "i" },
              },
            ],
          });
        }
      }

      return NextResponse.json(employee);
    }

    const filter: Record<string, unknown> = {};

    if (department) {
      filter.department = department;
    }

    if (manager) {
      filter.$or = [{ manager }];
    }

    if (search) {
      const searchFilter = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { identifier: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
      ];
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or as Record<string, unknown>[] },
          { $or: searchFilter },
        ];
        delete filter.$or;
      } else {
        filter.$or = searchFilter;
      }
    }

    const employees = await coll
      .find(filter)
      .project({
        identifier: 1,
        firstName: 1,
        lastName: 1,
        department: 1,
        position: 1,
        manager: 1,
        hireDate: 1,
        endDate: 1,
        email: 1,
      })
      .sort({ lastName: 1, firstName: 1 })
      .toArray();

    return NextResponse.json(employees);
  } catch (error) {
    console.error("GET /api/competency-matrix/employees error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
