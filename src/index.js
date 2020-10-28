import "./styles/index.scss";

import img from "./resources/diamon-clothing-desktop.png";

// Work scrolling
const viewWorkElement = document.querySelector("#work-anchor");

viewWorkElement.addEventListener("click", (event) => {
  event.preventDefault();

  const cardContainer = document.querySelector(".work");

  cardContainer.scrollIntoView({
    behavior: "smooth",
  });
});

// Typewritter

const typwriter = new Typewriter("#intro-dynamic", {
  loop: false,
});

const typewriterDeleteSpeed = 150;

typwriter
  .typeString("Exercise Enthusiast")
  .pauseFor(typewriterDeleteSpeed)
  .changeDeleteSpeed(10)
  .deleteChars(30)
  .typeString("Mech Eng Graduate")
  .pauseFor(typewriterDeleteSpeed)
  .deleteChars(30)
  .typeString("Front End Developer")
  .start();
