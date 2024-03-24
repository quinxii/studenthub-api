import { ApiProperty } from '@nestjs/swagger';
import { Base } from 'src/modules/base/base.entity';
import { Column, Entity } from 'typeorm';

@Entity({
  name: 'tech_stack',
  synchronize: false,
})
export class TechStack extends Base {
  @Column()
  @ApiProperty({ description: 'name' })
  name: string;
}
