import { createClient } from "https://esm.sh/@supabase/supabase-js";

console.log("app.js loaded");

// CONNECT TO SUPABASE
const supabase = createClient(
  "https://ipbjivlzlqztedqheuuk.supabase.co",
  "sb_publishable_jORGoPruLE_OXsiuiQXTAQ_Nc08h8fK"
);

// SIGN UP
window.signup = async function () {
  console.log("signup called");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert("Signup error: " + error.message);
  } else {
    alert("Signup successful! Now login.");
  }
};

// LOGIN
window.login = async function () {
  console.log("login called");

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

// CREATE POST
window.createPost = async function () {
  console.log("createPost called");

  const content = document.getElementById("postContent").value;

  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    alert("You must login first");
    return;
  }

  const { error } = await supabase
    .from("posts")
    .insert([{ user_id: user.user.id, content }]);

  if (error) {
    alert("Post error: " + error.message);
  } else {
    alert("Posted!");
  }
};

// LOAD POSTS
window.getPosts = async function () {
  console.log("getPosts called");

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("Load error: " + error.message);
    return;
  }

  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  data.forEach(post => {
    const div = document.createElement("div");
    div.className = "post";
    div.textContent = post.content;
    feed.appendChild(div);
  });
};
