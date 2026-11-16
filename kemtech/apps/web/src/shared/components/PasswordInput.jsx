import { useState } from 'react';
import Icon from './Icon.jsx';

/** Password field with a show/hide toggle. Extra props go to the input. */
export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw">
      <input {...props} type={show ? 'text' : 'password'} />
      <button type="button" className="pw-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
        <Icon name={show ? 'eyeoff' : 'eye'} plain size={18} />
      </button>
    </span>
  );
}
