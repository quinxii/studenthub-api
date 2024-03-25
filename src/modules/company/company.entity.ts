import { ApiProperty } from '@nestjs/swagger';
import { Base } from 'src/modules/base/base.entity';
import { User } from 'src/modules/user/user.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity({
  name: 'company',
})
export class Company extends Base {
  @Column({ name: 'user_id', type: 'bigint' })
  @ApiProperty({ description: 'userId' })
  userId: number | string;

  @Column()
  @ApiProperty({ description: 'fullname' })
  fullname: string;

  @Column({ name: 'company_size' })
  @ApiProperty({ description: 'companySize' })
  companySize: string;

  @Column({ name: 'company_name' })
  @ApiProperty({ description: 'companyName' })
  companyName: string;

  @Column()
  @ApiProperty({ description: 'website', nullable: true })
  website: string;

  @Column()
  @ApiProperty({ description: 'description', nullable: true })
  description: string;

  @OneToOne(() => User, (user) => user.company)
  @JoinColumn()
  user: User;
}
