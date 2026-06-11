import { PartialType } from '@nestjs/mapped-types';
import { CreateWholesalerDto } from './create-wholesaler.dto';

export class UpdateWholesalerDto extends PartialType(CreateWholesalerDto) {}
