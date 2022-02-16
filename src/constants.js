import diamond from "./resources/diamon-clothing-desktop-min.png";
import sudoku from "./resources/sudoku_clone.png";
import ipTracker from "./resources/ip-tracker-min.png";
import natours from "./resources/natours-api-min.png";
import forkiy from "./resources/forkify-desktop-min.png";
import archStudio from "./resources/arch_studio.png";

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
    category: "react",
    title: "Sudoku.com Clone",
    subtitle: "React JS, Material UI",
    demoURL: "https://sudoku-clone.vercel.app/",
    githubURL: "https://github.com/tomzacchia/sudoku-clone",
    bgUrl: sudoku,
  },
  {
    category: "all",
    title: "Arch Studio",
    subtitle: "SCSS, Responsive Design, Vite",
    demoURL: "https://arch-studio-vite.vercel.app",
    githubURL: "https://github.com/tomzacchia/arch-studio-vite/tree/master",
    bgUrl: archStudio,
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
];

export default PROJECTS;
