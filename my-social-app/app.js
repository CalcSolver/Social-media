import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "YOUR_SUPABASE_URL",
  "YOUR_SUPABASE_ANON_KEY"
);

window.signup = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await supabase.auth.signUp({ email, password });
};

window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await supabase.auth.signInWithPassword({ email, password });
};

window.createPost = async function () {
  const content = document.getElementById("postContent").value;

  const { data: user } = await supabase.auth.getUser();

  await supabase.from("posts").insert([
    { user_id: user.user.id, content }
  ]);
};

window.getPosts = async function () {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  data.forEach(post => {
    const div = document.createElement("div");
    div.textContent = post.content;
    feed.appendChild(div);
  });
};
