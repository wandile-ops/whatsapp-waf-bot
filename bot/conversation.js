const {
  getConversation,
  saveConversation,
  clearConversation
} = require("../firebase/database");


async function getState(phone) {

  const conversation =
    await getConversation(phone);

  if (!conversation) {

    return {
      phone,

      state: "START",

      data: {}
    };
  }

  return {
    phone,

    state:
      conversation.state || "START",

    data:
      conversation.data || {}
  };
}


async function updateState(
  phone,
  state,
  data
) {

  await saveConversation(

    phone,

    {
      state,

      data
    }

  );
}


async function resetState(phone) {

  await clearConversation(phone);
}


module.exports = {
  getState,
  updateState,
  resetState
};