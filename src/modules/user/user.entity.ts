import { ApiProperty } from '@nestjs/swagger';
import { Base } from 'src/common/base.entity';
import { UserRole } from 'src/common/common.enum';
import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { Student } from 'src/modules/student/student.entity';
import { Company } from 'src/modules/company/company.entity';
import { Message } from 'src/modules/message/message.entity';

@Entity({
  name: 'user',
})
export class User extends Base {
  @Column({ unique: true })
  @ApiProperty({ description: 'email' })
  email: string;

  @Column()
  @ApiProperty({ description: 'fullname' })
  fullname: string;

  @Column()
  @ApiProperty({ description: 'password' })
  password: string;

  @Column('text', { array: true, default: ['USER'] })
  @ApiProperty({ description: 'roles' })
  roles: UserRole[];

  @Column({ name: 'verified', default: false })
  verified: boolean;

  @Column({ default: false })
  @ApiProperty({ description: 'isConfirmed' })
  isConfirmed: boolean;

  @OneToOne(() => Student, (student) => student.user)
  student: Student;

  @OneToOne(() => Company, (company) => company.user)
  company: Company;

  @OneToMany(() => Message, message => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Message, message => message.receiver)
  receivedMessages: Message[];
}
