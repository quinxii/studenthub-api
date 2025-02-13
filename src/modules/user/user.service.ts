import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ForgotPasswordDto } from 'src/modules/user/dto/forgot-password.dto';
import { randomBytes } from 'crypto';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/modules/user/dto/update-user.dto';
import { User } from 'src/modules/user/user.entity';
import { PaginationResult, genPaginationResult } from 'src/shared/dtos/common.dtos';
import { HttpRequestContextService } from 'src/shared/http-request-context/http-request-context.service';
import { EntityCondition } from 'src/utils/types/entity-condition.type';
import { UserFindArgs } from 'src/modules/user/dto/user-find-args.dto';
import { UserChangePassDto } from 'src/modules/user/dto/change-pass-user.dto';
import { UpdateProfileDto } from 'src/modules/user/dto/update-profile.dto';
import { UserRole } from 'src/common/common.enum';
import { Student } from 'src/modules/student/student.entity';
import { Company } from 'src/modules/company/company.entity';
import { MailService } from 'src/modules/mail/mail.service'

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private readonly MailService: MailService,
    private readonly httpContext: HttpRequestContextService
  ) {}

  async create(createUserDto: CreateUserDto) {
    const user = await this.usersRepository.save(this.usersRepository.create(createUserDto));
    return user;
  }

  async findOne(fields: EntityCondition<User>): Promise<User> {
    return await this.usersRepository.findOne({
      relations: ['student', 'company'],
      where: fields,
    },);
  }

  async getAllUser(args: UserFindArgs): Promise<PaginationResult<User>> {
    const { limit, offset, q, roles, isActive, order } = args;
    const userId = this.httpContext.getUser().id;

    const record = this.usersRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.fullname', 'user.email', 'user.roles', 'user.isActive', 'user.createdAt'])
      .where('user.id != :userId', { userId });

    if (q) {
      record.andWhere('LOWER(CONCAT(user.fullname, user.email)) ILIKE LOWER(:keyword)', {
        keyword: `%${q}%`,
      });
    }

    if (roles) {
      record.andWhere(':roles = ANY(user.roles)', { roles: roles });
    }

    if (typeof isActive === 'boolean') {
      record.andWhere('user.isActive = :isActive', { isActive });
    }

    if (order && order === 'createdAt:ASC') {
      record.orderBy('user.createdAt', 'ASC');
    } else {
      record.orderBy('user.createdAt', 'DESC');
    }

    const [items, count] = await record
      .limit(limit || 10)
      .offset(offset || 0)
      .getManyAndCount();

    return genPaginationResult(items, count, args.offset, args.limit);
  }

  async add(userDto: CreateUserDto): Promise<void> {
    // const currentUserRoles = this.httpContext.getUser()?.roles || [];
    const { email, roles, password } = userDto;

    const existed = await this.usersRepository.findOneBy({ email });
    if (existed) {
      throw new ConflictException('This email is already associated with an account');
    }

    // if (currentUserRoles.includes(UserRole.MANAGER) && roles.includes(UserRole.ADMIN)) {
    //   throw new ForbiddenException();
    // }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      roles,
    });

    await this.usersRepository.save(user);
  }

  async update(userId: string, userDto: UpdateUserDto): Promise<void> {
    const currentUserRoles = this.httpContext.getUser()?.roles || [];
    const role = userDto.roles;
    if (currentUserRoles.includes(UserRole.MANAGER) && role?.includes(UserRole.ADMIN)) {
      throw new ForbiddenException();
    }
    await this.usersRepository.update(userId, userDto);
  }

  async delete(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async changePassword(userChangePassDto: UserChangePassDto): Promise<void> {
    const { oldPassword, newPassword } = userChangePassDto;

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const currentUser = this.httpContext.getUser();
    const user = await this.findOne({ id: currentUser.id });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (isValidPassword && newPassword !== oldPassword) {
      await this.usersRepository.update(currentUser.id, { password: hashedPassword });
    } else {
      throw new ForbiddenException('Invalid password');
    }
  }

  async updateProfile(updateProfileDto: UpdateProfileDto): Promise<void> {
    const currentUser = this.httpContext.getUser();
    await this.usersRepository.update(currentUser.id, updateProfileDto);
  }

  async updateConfirm(email: string, isConfirmed: boolean): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
        throw new NotFoundException('User not found');
    }
    user.isConfirmed = isConfirmed;
    user.verified = isConfirmed;
    await this.usersRepository.save(user);
    return user;
}

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.usersRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newPassword = this.generateRandomPassword();

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.usersRepository.update(user.id, { password: hashedPassword });

    await this.MailService.sendNewPasswordEmail(email, newPassword);
  }

  private generateRandomPassword(): string {
    return randomBytes(8).toString('hex');
  }
}
