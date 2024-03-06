import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ResponseDto } from 'src/common/dtos/response.dto';
import { SendVerificationCodeDto } from '../dtos/send-verification-code.dto';
import { CheckEmailDto } from '../dtos/check-email.dto';
import { CheckPasswordDto } from '../dtos/check-password.dto';
import { CheckNameDto } from '../dtos/check-name.dto';
import { SignUpDto } from '../dtos/sign-up.dto';
import { PasswordStrength } from 'src/common/unions/password-strength.union';
import { verificationCodeUtil } from 'src/common/utils/send-verification-code.util';
import { bcryptUtil } from 'src/common/utils/bcrypt.util';
import { uuidUtil } from 'src/common/utils/uuid.util';
import { UserRepositoryService } from './user-repository.service';
import { DeleteUserDto } from '../dtos/delete-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { SignUpUser, UpdateUser } from '../interface/repository.interface';
import { configUtil } from 'src/common/utils/config.util';
import { UserRedisService } from './user-redis.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepositoryService,
    private readonly userRedis: UserRedisService,
  ) {}

  async isAlreadyEmail(dto: CheckEmailDto): Promise<ResponseDto> {
    const email = dto.getEmail();
    const isAlreadyEmail = await this.userRepository.findByEmail(email);

    if (isAlreadyEmail) {
      throw new UnauthorizedException('가입할 수 없는 이메일입니다.');
    }

    return ResponseDto.success();
  }

  async checkName(dto: CheckNameDto): Promise<ResponseDto> {
    const userName = dto.getName();
    const isAlreadyName = await this.userRepository.findByName(userName);

    if (isAlreadyName) {
      throw new UnauthorizedException('가입할 수 없는 이름입니다.');
    }

    return ResponseDto.success();
  }

  checkPassword(dto: CheckPasswordDto): PasswordStrength {
    const password = dto.getPassword();
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/\W/.test(password)) strength++;
    if (/(\w)\1/.test(password)) strength--;

    switch (strength) {
      case 4:
        return '매우 강함';
      case 3:
        return '강함';
      case 2:
        return '보통';
      case 1:
        return '약함';
      default:
        return '매우 약함';
    }
  }

  async sendVerificationCode(
    dto: SendVerificationCodeDto,
  ): Promise<ResponseDto> {
    const code = uuidUtil().randomNumericString();
    const email = dto.getEmail();
    const emailInfo = {
      email,
      subject: '[APP] 인증번호 안내',
      contents: `인증번호는 ${code} 입니다.`,
    };
    const redisInfo = {
      key: email,
      value: code,
      time: 60 * 5,
    };

    await this.userRedis.setVerificationCode(redisInfo);
    await verificationCodeUtil().sendToEmail(emailInfo);

    return ResponseDto.success();
  }

  async signUp(dto: SignUpDto): Promise<ResponseDto> {
    const email = dto.getEmail();
    const verificationCode = await this.userRedis.getVerificationCode(email);

    if (dto.getVerificationCode() !== verificationCode) {
      throw new UnauthorizedException('인증번호가 일치하지 않습니다.');
    }

    const nick_name = dto.getName();
    const userPassword = dto.getPassword();
    const proFileImageUrl = dto.getProfileImageUrl();
    const aboutMe = dto.getAboutMe();
    const password = await bcryptUtil().hash(userPassword);
    const userInfo: SignUpUser = {
      email,
      nick_name,
      password,
    };

    if (aboutMe) userInfo.about_me = aboutMe;
    if (proFileImageUrl) {
      const imageUrl = `${configUtil().getImgFileUrl(
        'url',
      )}/${uuidUtil().v4()}`;
      userInfo.profile_image_url = imageUrl;
    }

    await this.userRedis.deleteVerificationCode(email);
    await this.userRepository.saveUser(userInfo);

    return ResponseDto.success();
  }

  async updateUser(dto: UpdateUserDto): Promise<ResponseDto> {
    const email = dto.getEmail();
    const nick_name = dto.getNickName();
    const password = dto.getPassword();
    const about_me = dto.getAboutMe();
    const profile_image_url = dto.getProfileImageUrl();
    const userInfo: UpdateUser = {
      email,
    };

    if (nick_name) userInfo.nick_name = nick_name;
    if (password) userInfo.password = await bcryptUtil().hash(password);
    if (about_me) userInfo.about_me = about_me;
    if (profile_image_url) {
      const imageUrl = `${configUtil().getImgFileUrl(
        'url',
      )}/${uuidUtil().v4()}`;
      userInfo.profile_image_url = imageUrl;
    }

    await this.userRepository.updateUser(userInfo);

    return ResponseDto.success();
  }

  async deleteUser(dto: DeleteUserDto): Promise<ResponseDto> {
    const userEmail = dto.getEmail();

    await this.userRepository.deleteUser(userEmail);

    return ResponseDto.success();
  }
}
