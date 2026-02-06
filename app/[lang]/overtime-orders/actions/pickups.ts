'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { ObjectId } from 'mongodb';
import { redirect } from 'next/navigation';
import { overtimeRequestEmployeeType } from '../lib/types';
import { revalidateOvertimeOrders, revalidateOvertimeOrdersRequest } from './utils';

export async function deleteDayOff(
  overtimeId: string,
  employeeIdentifier: string,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-orders');
  }
  try {
    const coll = await dbc('overtime_orders');

    // Check if the user is authorized to modify this request
    const request = await coll.findOne({ _id: new ObjectId(overtimeId) });
    if (!request) {
      return { error: 'not found' };
    }

    // Check if status allows modifications
    if (request.status === 'completed' || request.status === 'rejected') {
      return { error: 'invalid status' };
    }

    if (
      request.requestedBy !== session.user.email &&
      !session.user.roles?.includes('admin') &&
      !session.user.roles?.includes('production-manager') &&
      !session.user.roles?.includes('group-leader') &&
      !session.user.roles?.includes('plant-manager') &&
      !session.user.roles?.includes('hr')
    ) {
      return { error: 'unauthorized' };
    }

    // Use $pull to remove the employee with specified identifier from the employeesWithScheduledDayOff array
    const update = await coll.updateOne(
      { _id: new ObjectId(overtimeId) },
      {
        $pull: {
          employeesWithScheduledDayOff: { identifier: employeeIdentifier },
        },
        $set: {
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      } as any,
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    if (update.modifiedCount === 0) {
      return { error: 'not found employee' };
    }

    revalidateOvertimeOrders();
    return { success: 'deleted' };
  } catch (error) {
    console.error(error);
    return { error: 'deleteTimeOffRequest server action error' };
  }
}

export async function addEmployeeDayOff(
  overtimeId: string,
  newEmployee: overtimeRequestEmployeeType,
) {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/overtime-orders');
  }
  try {
    const coll = await dbc('overtime_orders');

    // Check if the user is authorized to modify this request
    const request = await coll.findOne({ _id: new ObjectId(overtimeId) });
    if (!request) {
      return { error: 'not found' };
    }

    if (
      request.requestedBy !== session.user.email &&
      !session.user.roles?.includes('admin') &&
      !session.user.roles?.includes('plant-manager') &&
      !session.user.roles?.includes('hr')
    ) {
      return { error: 'unauthorized' };
    }

    // Check if an employee with the same identifier already exists in the employeesWithScheduledDayOff array
    const employeeExists = request.employeesWithScheduledDayOff?.some(
      (employee: overtimeRequestEmployeeType) =>
        employee.identifier === newEmployee.identifier,
    );

    if (employeeExists) {
      return { error: 'employee already exists' };
    }

    // Check if the number of employees with scheduled days off doesn't exceed the total number
    const employeesWithDaysOffCount =
      request.employeesWithScheduledDayOff?.length || 0;

    // Check if adding another employee would exceed the total number of employees
    if (employeesWithDaysOffCount + 1 > request.numberOfEmployees) {
      return { error: 'too many employees with scheduled days off' };
    }

    // Add the new employee to the employeesWithScheduledDayOff array
    const update = await coll.updateOne(
      { _id: new ObjectId(overtimeId) },
      {
        $push: {
          employeesWithScheduledDayOff: newEmployee,
        },
        $set: {
          editedAt: new Date(),
          editedBy: session.user.email,
        },
      } as any,
    );

    if (update.matchedCount === 0) {
      return { error: 'not found' };
    }

    revalidateOvertimeOrders();
    revalidateOvertimeOrdersRequest();
    return { success: 'added' };
  } catch (error) {
    console.error(error);
    return { error: 'addEmployeeDayOff server action error' };
  }
}
