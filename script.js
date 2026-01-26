const socket = io("http://localhost:8000");

const progressBoxes = document.querySelectorAll(".progress-box");
const percentTags = document.querySelectorAll(".percent-tag");

for (let index = 0; index < progressBoxes.length; index++) {
  const element = progressBoxes[index];
  element.addEventListener("click", () => {
    addVote(element, element.id);
  });
}

let vote = false;
const addVote = (element, id) => {
  if (vote) {
    return;
  }
  let voteTo = id;
  socket.emit("send-vote", voteTo);
  vote = true;
  element.classList.add("active");
};
socket.on("recieve-vote", (data) => {
  updatePolls(data);
});

socket.on("update ", (data) => {
  updatePolls(data);
  console.log(data);
});

const updatePolls = (data) => {
  let voteingObject = data.votingPolls;
  let totalvotes = data.totalvotes;
  for (let i = 0; i < percentTags.length; i++) {
    let vote = votingObject[progressBoxes[i].id];
    let setWidth = Math.round((vote / totalVotes) * 100);
    const element = document
      .querySelector(`#${progressBoxes[i].id}`)
      .querySelector(".percent-tag");
    element.setAttribute("data", `${!setWidth ? 0 : setWidth}%`);
    element.style.width = `${!setWidth ? 0 : setWidth}%`;
    console.log(element);
  }
};
