import { useState } from 'react';
import LoginScreen          from './LoginScreen';
import RegisterScreen       from './RegisterScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import ResetPasswordScreen  from './ResetPasswordScreen';
import VerifyEmailScreen    from './VerifyEmailScreen';

const SCREENS = {
  login:             LoginScreen,
  register:          RegisterScreen,
  'forgot-password': ForgotPasswordScreen,
  'reset-password':  ResetPasswordScreen,
  'verify-email':    VerifyEmailScreen,
};

export default function AuthFlow() {
  const [view, setView] = useState('login');

  const Screen = SCREENS[view] || LoginScreen;

  return <Screen onNavigate={setView} />;
}
