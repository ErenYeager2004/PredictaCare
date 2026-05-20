import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResearchContext } from "../context/ResearchContext";
import { toast } from "react-toastify";
import axios from "axios";
import workingBrain from "../assets/working brain.json";
import heart from "../assets/Human Heart.json";
import diabetes from "../assets/Diabetes Blood Cells.json";
import pcos from "../assets/Uterus.json";
import Lottie from "lottie-react";

const DISEASE_ANIMATIONS = {
  heart: heart,
  diabetes: diabetes,
  pcos: pcos,
  stroke: workingBrain,
};
const DISEASE_LABEL = {
  heart: "Heart Disease",
  diabetes: "Diabetes",
  pcos: "PCOS",
  stroke: "Stroke",
};

const MyOrders = () => {
  const { rToken, backendUrl } = useContext(ResearchContext);
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    loadMyDatasets();
  }, []);

  const loadMyDatasets = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/research-hub/my-datasets`,
        {
          headers: { rtoken: rToken },
        },
      );
      if (data.success) setDatasets(data.datasets);
    } catch {
      toast.error("Could not load your datasets");
    }
    setLoading(false);
  };

  const handleRedownload = async (datasetId, disease, format = "csv") => {
    setDownloading(datasetId);
    try {
      const res = await axios.get(
        `${backendUrl}/api/research-hub/redownload/${datasetId}?format=${format}`,
        { headers: { rtoken: rToken }, responseType: "blob" },
      );
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([res.data]));
      link.download = `predictacare_${disease}_${Date.now()}.${format}`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Dataset downloaded!");
      loadMyDatasets();
    } catch {
      toast.error("Download failed. Please try again.");
    }
    setDownloading(null);
  };

  if (loading)
    return (
      <div className="p-6 sm:p-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          My Datasets
        </h1>
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-28 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );

  if (!datasets.length)
    return (
      <div className="p-6 sm:p-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          My Datasets
        </h1>
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
          <p className="text-5xl mb-4">📦</p>
          <p className="font-semibold text-gray-700 text-lg">No datasets yet</p>
          <p className="text-sm text-gray-400 mt-2 mb-6 max-w-xs mx-auto">
            Purchase a dataset, use the 10-min token from your email to download
            it — it'll appear here permanently after first download.
          </p>
          <button
            onClick={() => navigate("/datasets")}
            className="bg-[#5F6FFF] text-white px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-[#4a57e8] transition-colors"
          >
            Browse Datasets
          </button>
        </div>

        <div className="mt-6 bg-[#eef0ff] rounded-xl p-5 border border-[#d4d8ff]">
          <h3 className="font-semibold text-[#5F6FFF] text-sm mb-3">
            How it works
          </h3>
          <div className="flex flex-col gap-2">
            {[
              "Purchase a dataset from the Datasets page",
              "Check your email for the 10-minute access token",
              "Paste the token in the Download tab and download",
              "Your dataset appears here and is re-downloadable forever",
            ].map((text, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-gray-700"
              >
                <div className="w-6 h-6 rounded-full bg-[#5F6FFF] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="p-6 sm:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Datasets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {datasets.length} dataset{datasets.length !== 1 ? "s" : ""} ·
            Re-downloadable anytime
          </p>
        </div>
        <button
          onClick={() => navigate("/datasets")}
          className="text-sm text-[#5F6FFF] border border-[#5F6FFF] px-4 py-2 rounded-full hover:bg-[#eef0ff] transition-colors font-medium"
        >
          + Buy More
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {datasets.map((ds) => (
          <div
            key={ds._id}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <Lottie
                    animationData={
                      DISEASE_ANIMATIONS[ds.disease] || heartAnimation
                    }
                    loop
                    autoplay
                    speed={0.7}
                    style={{
                      width: 58,
                      height: 58,
                    }}
                  />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base capitalize">
                    {DISEASE_LABEL[ds.disease] || ds.disease}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {ds.recordCount?.toLocaleString()} records ·{" "}
                    {(ds.format || "csv").toUpperCase()} · ₹
                    {((ds.amount || 0) / 100).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-400">
                      Purchased{" "}
                      {new Date(ds.downloadedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-100">
                      ✓ Owned permanently
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <button
                  onClick={() =>
                    handleRedownload(ds._id, ds.disease, ds.format || "csv")
                  }
                  disabled={downloading === ds._id}
                  className="flex items-center gap-2 bg-[#5F6FFF] hover:bg-[#4a57e8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {downloading === ds._id ? (
                    "Downloading..."
                  ) : (
                    <>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400">
                  {ds.downloadCount || 1} download
                  {(ds.downloadCount || 1) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {ds.lastDownloadedAt && (
              <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                Last downloaded{" "}
                {new Date(ds.lastDownloadedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOrders;
