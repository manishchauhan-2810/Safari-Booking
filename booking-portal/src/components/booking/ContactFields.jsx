import { Input } from '../ui/Input';

export const ContactFields = ({ contact, onChange, onBlur, touched, errors }) => (
  <>
    <Input
      label="Contact name"
      placeholder="Enter your name"
      autoComplete="name"
      maxLength={80}
      value={contact.name}
      onChange={(e) => onChange('name', e.target.value)}
      onBlur={() => onBlur('name')}
      error={touched.name ? errors.name : ''}
    />
    <Input
      label="Mobile"
      placeholder="10-digit mobile number"
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={10}
      value={contact.mobile}
      onChange={(e) => onChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
      onBlur={() => onBlur('mobile')}
      error={touched.mobile ? errors.mobile : ''}
    />
    <Input
      label="Email"
      placeholder="your.email@example.com"
      type="email"
      autoComplete="email"
      value={contact.email}
      onChange={(e) => onChange('email', e.target.value)}
      onBlur={() => onBlur('email')}
      error={touched.email ? errors.email : ''}
    />
  </>
);