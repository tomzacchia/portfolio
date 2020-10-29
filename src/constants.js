import diamond from "./resources/diamon-clothing-desktop-min.png";
import rockPaperScissors from "./resources/rock-paper-scissors-min.png";
import ipTracker from "./resources/ip-tracker-min.png";
import natours from "./resources/natours-api-min.png";
import forkiy from "./resources/forkify-desktop-min.png";
import newsweek from "./resources/newsweek-desktop-min.png";

const PROJECTS = [
  {
    category: "react",
    title: "Diamond Clothing Co",
    subtitle: "React JS",
    demoURL: "https://react-diamond-clothing.herokuapp.com/",
    githubURL: "https://github.com/tomzacchia/ecommerce-project",
    bgUrl: diamond,
  },
  {
    category: "js",
    title: "Rock Paper Scissors",
    subtitle: "JS, SCSS, Webpack",
    demoURL: "https://rock-paper-scissors.tomzacchia.vercel.app/",
    githubURL: "https://github.com/tomzacchia/rock-paper-scissors",
    bgUrl: rockPaperScissors,
  },
  {
    category: "js",
    title: "IP Tracker",
    subtitle: "HTML, CSS, JS",
    demoURL: "https://ip-address-tracker.tomzacchia.vercel.app/",
    githubURL: "https://github.com/tomzacchia/ip-address-tracker",
    bgUrl: ipTracker,
  },
  {
    category: "node",
    title: "Natours API",
    subtitle: "Node JS",
    demoURL: "https://github.com/tomzacchia/Natours",
    githubURL: "https://github.com/tomzacchia/Natours",
    bgUrl: natours,
  },
  {
    category: "js",
    title: "Forkify",
    subtitle: "JS, Webpack",
    demoURL:
      "https://rawcdn.githack.com/tomzacchia/forkify/8f75d4d018c030c48ba0a2254e91364f141d7ffb/dist/index.html",
    githubURL: "https://github.com/tomzacchia/forkify",
    bgUrl: forkiy,
  },
  {
    category: "all",
    title: "Newsweek UI Clone",
    subtitle: "SCSS, Responsive Design",
    demoURL:
      "https://raw.githack.com/tomzacchia/newsweek_ui_clone/dev/index.html",
    githubURL: "https://github.com/tomzacchia/newsweek_ui_clone",
    bgUrl: newsweek,
  },
];

export default PROJECTS;
