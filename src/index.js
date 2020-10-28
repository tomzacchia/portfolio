import "./styles/index.scss";
import natours from "./resources/natours-api.png";

//==================================== Typewritter
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

//==================================== Work scrolling
const viewWorkElement = document.querySelector("#work-anchor");

viewWorkElement.addEventListener("click", (event) => {
  event.preventDefault();

  const cardContainer = document.querySelector(".work");

  cardContainer.scrollIntoView({
    behavior: "smooth",
  });
});

//==================================== WORK FILTERS ANIMATION
const filtersContainer = document.querySelector(".work-filters");
let previousFilter;

filtersContainer.addEventListener("click", function (event) {
  let target = event.target;

  highlightTarget(target);
});

const highlightTarget = function (target) {
  if (previousFilter) {
    previousFilter.classList.remove("work-filter-highlight");
  }
  previousFilter = target;
  previousFilter.classList.add("work-filter-highlight");
};

//==================================== CARD
const cards = document.querySelectorAll(".card-container");

cards.forEach((card) => {
  card.style.backgroundImage = `url(${natours})`;
});
