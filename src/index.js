import mixitUp from "mixitup";
import projects from "./constants";
require("./resources/favicon.png");

import "./styles/index.scss";

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
const defaultFilter = document.querySelectorAll(".work-filters p")[0];
let previousFilter = defaultFilter;

filtersContainer.addEventListener("click", function (event) {
  let target = event.target;

  if (target.closest("p")) highlightTarget(target);
});

const highlightTarget = function (target) {
  if (previousFilter) {
    previousFilter.classList.remove("work-filter-highlight");
  }
  previousFilter = target;
  previousFilter.classList.add("work-filter-highlight");
};

//==================================== CARD
const portfolioContainer = document.querySelector(".portfolio-container");

projects.forEach((project) => {
  let cardMarkup = `
    <div class="mix card-container ${project.category}" style="background-image: url(${project.bgUrl})">
      <div class="card-container-overlay">
        <div class="titles-container">
          <h1> ${project.title} </h1>
          <p> ${project.subtitle} </p>
        </div>
        <div class="call-to-action">
          <a
            href="${project.demoURL}"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="fas fa-link"></i>
          </a>
          <a href="${project.githubURL}" target="_blank">
            <i class="fab fa-github"></i>
          </a>
        </div>
      </div>
    </div>
  `;

  portfolioContainer.insertAdjacentHTML("beforeend", cardMarkup);
});

const mixer = mixitUp(portfolioContainer);
