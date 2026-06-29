import { createClient } from "https://esm.sh/@supabase/supabase-js";
console.log("JS is working!");
window.signup = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert("Signup error: " + error.message);
  } else {
    alert("Signup successful! Now click Login.");
  }
};

window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Login error: " + error.message);
  } else {
    alert("Login successful!");
  }
};
