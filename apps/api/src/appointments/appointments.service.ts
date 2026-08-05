import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Appointment } from '../generated/prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** List every appointment owned by the user, chronological (date, then time). */
  async list(userId: string): Promise<AppointmentResponseDto[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: { userId },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return appointments.map((a) => this.mapToResponseDto(a));
  }

  async create(userId: string, dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.create({
      data: {
        userId,
        date: this.parseDate(dto.date),
        startTime: dto.startTime ?? null,
        note: dto.note,
        emailReminder: dto.emailReminder ?? false,
      },
    });
    return this.mapToResponseDto(appointment);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    // Scope the ownership check to the caller — updating a row that isn't
    // theirs must look identical to the row not existing.
    await this.getOwnedOrThrow(userId, id);

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.date !== undefined ? { date: this.parseDate(dto.date) } : {}),
        ...(dto.startTime !== undefined ? { startTime: dto.startTime || null } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.emailReminder !== undefined ? { emailReminder: dto.emailReminder } : {}),
      },
    });
    return this.mapToResponseDto(appointment);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwnedOrThrow(userId, id);
    await this.prisma.appointment.delete({ where: { id } });
  }

  private async getOwnedOrThrow(userId: string, id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findFirst({ where: { id, userId } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  /** "YYYY-MM-DD" → UTC-midnight Date, rejecting impossible calendar dates. */
  private parseDate(value: string): Date {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('date is not a valid calendar date');
    }
    return parsed;
  }

  private mapToResponseDto(appointment: Appointment): AppointmentResponseDto {
    return {
      id: appointment.id,
      // @db.Date rows come back as UTC-midnight — slice keeps the calendar day
      // stable regardless of the server's timezone.
      date: appointment.date.toISOString().slice(0, 10),
      startTime: appointment.startTime ?? undefined,
      note: appointment.note,
      emailReminder: appointment.emailReminder,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}
