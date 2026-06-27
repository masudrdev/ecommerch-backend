import prisma from "../lib/prisma.js";

export const getMyAddresses = async (req, res) => {
  try {
    const addresses = await prisma.userAddress.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    res.json({
      success: true,
      addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createAddress = async (req, res) => {
  try {
    const {
      type = "HOME",
      fullName,
      phone,
      address,
      district,
      upazila,
      isDefault = false,
    } = req.body;

    if (!fullName || !phone || !address || !district || !upazila) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required",
      });
    }

    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.userAddress.create({
      data: {
        userId: req.user.id,
        type,
        fullName,
        phone,
        address,
        district,
        upazila,
        isDefault,
      },
    });

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.userAddress.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const {
      type,
      fullName,
      phone,
      address,
      district,
      upazila,
      isDefault,
    } = req.body;

    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.userAddress.update({
      where: { id },
      data: {
        type,
        fullName,
        phone,
        address,
        district,
        upazila,
        isDefault,
      },
    });

    res.json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.userAddress.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await prisma.userAddress.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};