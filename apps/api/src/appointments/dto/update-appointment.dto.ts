import { PartialType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';

/** All fields optional — used for PATCH /appointments/:id. */
export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}
