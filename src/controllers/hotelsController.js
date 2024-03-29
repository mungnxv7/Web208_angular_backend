import slugify from "slugify";
import cloudinary from "../config/cloudinaryConfig.js";

import Hotels from "../models/hotelsModel.js";
import { hotelValidate } from "../validation/hotelValidate.js";

const hotelsController = {
  async getListHotels(req, res) {
    try {
      const {
        page = 1,
        limit = "5",
        sort = "createdAt",
        order = "asc",
        search = "",
        filter = "",
      } = req.query;

      const option = {
        page: page,
        limit: limit,
        sort: { [sort]: order === "asc" ? 1 : -1 },
      };
      const listCategory = filter.split(",");
      let query = { hotelName: { $regex: search, $options: "i" } };

      if (filter != "") {
        query.hotelType = listCategory;
      }
      const hotels = await Hotels.paginate(query, option);
      if (hotels.docs.length > 0) {
        // Lấy mảng các ID của các khách sạn từ kết quả paginate
        const hotelIds = hotels.docs.map((hotel) => hotel._id);
        const detailedHotels = await Hotels.find({
          _id: { $in: hotelIds },
        }).populate("hotelType");
        return res.status(200).json({ docs: detailedHotels, ...hotels });
      } else {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
      }
    } catch (error) {
      res.status(500).send("Lỗi máy chủ: " + error.message);
    }
  },

  async changeSearch(req, res) {
    try {
      const search = req.query.name;
      const hotels = await Hotels.find({
        hotelName: { $regex: search, $options: "i" },
      }).populate("hotelType");
      if (hotels.length == 0 || !hotels) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy khách sạn nào" });
      }
      res.status(200).json(hotels);
    } catch (error) {}
  },
  async getHotelDetail(req, res) {
    try {
      const { id } = req.params;
      const hotel = await Hotels.findOne({ _id: id });
      if (hotel) {
        res.status(200).json(hotel);
      } else {
        res.status(404).json({ message: "Lỗi lấy dữ liệu từ máy chủ" });
      }
    } catch (error) {
      res.status(500).send("Lỗi máy chủ: " + error.message);
    }
  },

  async deleteHotel(req, res) {
    try {
      const { id } = req.params;
      if (id) {
        // const product = await Hotels.findOne({ _id: id });
        // await cloudinary.uploader.destroy(product.image.filename);
        await Hotels.deleteOne({ _id: id });
        res.status(200).json({ message: "Xóa sản phẩm thành công" });
      }
    } catch (error) {
      res.status(500).send("Lỗi máy chủ: " + error.message);
    }
  },

  async postHotel(req, res) {
    try {
      const data = req.body;
      // const data = {
      //   ...req.body,
      //   image: { filename: req.file.filename, path: req.file.path },
      // };
      const { error } = hotelValidate.validate(data);
      if (error) {
        // if (req.file) {
        //   await cloudinary.uploader.destroy(req.file.filename);
        // }
        let messageError = [];
        error.details.map((messError) => {
          messageError.push(messError.message);
          res.status(400).json(messageError);
        });
        return;
      }

      const hotelExists = await Hotels.findOne({ hotelName: data.hotelName });
      if (hotelExists) {
        return res
          .status(400)
          .json({ message: "Khách sạn đã tồn tại", hotelExists });
      }

      const slug = slugify(data.hotelName, { lower: true });
      const result = await Hotels.create({ ...data, slug: slug });
      res
        .status(200)
        .json({ message: "Thêm sản phẩm thành công", data: result._doc });
    } catch (error) {
      res.status(500).send("Lỗi máy chủ: " + error.message);
    }
  },

  async putHotel(req, res) {
    try {
      const { id } = req.params;

      const data = req.body;
      // if (req.file) {
      //   const product = await Product.findOne({ _id: id });
      //   await cloudinary.uploader.destroy(product.image.filename);
      //   data = {
      //     ...req.body,
      //     image: { filename: req.file.filename, path: req.file.path },
      //   };
      // } else {
      //   data = req.body;
      // }
      const { error } = hotelValidate.validate(data);
      if (error) {
        let messageError = [];
        error.details.map((messError) => {
          messageError.push(messError.message);
          res.status(400).json(messageError);
        });
        return;
      }
      const hotelExists = await Hotels.find({
        hotelName: data.hotelName,
        _id: { $ne: id },
      });
      if (hotelExists != "") {
        return res.status(400).json({ message: "Khách sạn đã tồn tại" });
      }
      data.slug = slugify(data.hotelName, { lower: true });
      res.json(data);
      await Hotels.updateOne({ _id: id }, data);
      res.status(200).json({ message: "Cập nhật sản phẩm thành công" });
    } catch (error) {
      res.status(500).send("Lỗi máy chủ: " + error.message);
    }
  },
};
export default hotelsController;
