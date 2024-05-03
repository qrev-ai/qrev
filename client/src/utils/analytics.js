export const trackError = (err, { page, type }) => {
  console.log(`Something went wrong in the "${page}" page for "${type}" call.`, err);
};
