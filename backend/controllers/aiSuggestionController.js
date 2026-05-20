import fetch from "node-fetch";

const FLASK_URL =
  process.env.RAG_SERVER_URL || "http://localhost:5001";

export const generateAISuggestions = async (req, res) => {

  try {

    const {
      disease,
      risk,
      probability,
      userInputs,
    } = req.body;

    const response = await fetch(
      `${FLASK_URL}/rag-health-suggestions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          disease,
          risk,
          probability,
          userInputs,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {

      console.error(
        "[FLASK ERROR]",
        data.error
      );

      return res.status(500).json({
        success: false,
        message: data.error,
      });
    }

    return res.json({
      success: true,
      reply: data.reply,
    });

  } catch (error) {

    console.error(
      "[AI SUGGESTION ERROR]",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
