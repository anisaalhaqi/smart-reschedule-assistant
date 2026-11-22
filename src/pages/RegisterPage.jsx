import React from "react";
import { Link, useNavigate } from "react-router-dom";
import RegisterInput from "../pages/RegisterInput";
import { register } from "../data/AuthAPI";

function RegisterPage() {
  const navigate = useNavigate();

  async function onRegisterHandler(user) {
    const { error } = await register(user);
    if (!error) {
      navigate("/");
    }
  }

  return (
    <section className="register-page">
      <h2>Register</h2>
      <RegisterInput register={onRegisterHandler} />
      <p>
        Already have an account? <Link to="/">Login</Link>
      </p>
    </section>
  );
}

export default RegisterPage;
