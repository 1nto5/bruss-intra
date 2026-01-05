import { dbc } from '@/lib/db/mongo';
import { convertToTimezone } from '@/lib/utils/date-format';
import { Workbook } from 'exceljs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query: any = {};

  searchParams.forEach((value, key) => {
    if (key === 'from' || key === 'to') {
      if (key === 'from') {
        if (!query.from) query.from = {};
        query.from.$gte = new Date(value);
      }
      if (key === 'to') {
        if (!query.to) query.to = {};
        query.to.$lte = new Date(value);
      }
    } else if (key === 'responsible' || key === 'supervisor') {
      query[key] = { $regex: new RegExp(value, 'i') };
    } else {
      query[key] = value;
    }
  });
  try {
    const coll = await dbc('failures_lv');
    const failures = await coll
      .find(query)
      .sort({ _id: -1 })
      .limit(10000)
      .toArray();

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Failures LV');

    sheet.columns = [
      { header: 'ID', key: '_id', width: 24, hidden: true },
      { header: 'Line', key: 'line', width: 10 },
      { header: 'Station', key: 'station', width: 15 },
      { header: 'Failure', key: 'failure', width: 30 },
      { header: 'From', key: 'from', width: 12 },
      { header: 'To', key: 'to', width: 12 },
      { header: 'Supervisor', key: 'supervisor', width: 15 },
      { header: 'Responsible', key: 'responsible', width: 15 },
      { header: 'Solution', key: 'solution', width: 30 },
      { header: 'Comment', key: 'comment', width: 30 },
      { header: 'Created At', key: 'createdAt', width: 12 },
      { header: 'Updated At', key: 'updatedAt', width: 12 },
    ];

    const convertToWarsawTime = (date: Date) => {
      if (!date) return null;
      return convertToTimezone(date, 'Europe/Warsaw');
    };

    failures.forEach((failure) => {
      const row = {
        _id: failure._id.toString(),
        line: failure.line,
        station: failure.station,
        failure: failure.failure,
        from: failure.from ? convertToWarsawTime(new Date(failure.from)) : '',
        to: failure.to ? convertToWarsawTime(new Date(failure.to)) : '',
        supervisor: failure.supervisor,
        responsible: failure.responsible,
        solution: failure.solution,
        comment: failure.comment,
        createdAt: failure.createdAt
          ? convertToWarsawTime(new Date(failure.createdAt))
          : '',
        updatedAt: failure.updatedAt
          ? convertToWarsawTime(new Date(failure.updatedAt))
          : '',
      };
      sheet.addRow(row);
    });

    // Tworzenie pliku Excel w pamięci
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="failures-lv.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json(
      { error: 'failures/lv/excel api' },
      { status: 503 }
    );
  }
}
