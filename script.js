function toggleForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (formType === 'signup') {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    } else {
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    }
}
    window.onload = function() {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      if (error =="welcome") {
            alert("welcome to expense Tracker Please Login to Continue");
      }
      else if(error =="exists"){
        document.getElementById('errorMessage').innerHTML = "UserName already Exists";
      }
      else{
        document.getElementById('errorMessage').innerHTML = error;
      }
    };
