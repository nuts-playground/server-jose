export interface UserControllerSignUp {
  readonly email: string;
  readonly nick_name: string;
  readonly password: string;
  readonly verificationCode: string;
  readonly about_me?: string;
  readonly profile_image_url?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly delete_yn?: string;
}

export interface UserControllerUpdate {
  readonly id: number;
  readonly nick_name?: string;
  readonly password?: string;
  readonly about_me?: string;
  readonly profile_image_url?: string;
}
