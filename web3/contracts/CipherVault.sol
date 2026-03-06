// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CipherVault is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    uint256 private _itemsSold;

    struct VaultItem {
        uint256 id;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool isListed;
        bool isCopy;
        string encryptedCid;
        string previewURI;
        string name;
        string description;
        bool useEscrow;
        address buyer;
        bool sellerConfirmed;
        bool buyerConfirmed;
        bool isEscrowActive;
    }

    mapping(uint256 => VaultItem) private idToVaultItem;

    // --- EVENTS (INI KUNCI REALTIME) ---
    event VaultItemCreated(uint256 indexed tokenId, address owner);
    event AssetListed(uint256 indexed tokenId, uint256 price);
    event ListingUpdated(uint256 indexed tokenId, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);
    event AssetSold(uint256 indexed tokenId, address buyer, uint256 price);
    event AssetTransferred(uint256 indexed tokenId, address from, address to);
    event EscrowUpdate(uint256 indexed tokenId, string status); // status: "Start", "Confirm", "Cancel"
    event AssetBurned(uint256 indexed tokenId);

    constructor() ERC721("CipherVault", "CVT") Ownable(msg.sender) {}

    function mintToVault(string memory tokenURI, string memory name) public returns (uint256) {
        _tokenIds++;
        uint256 newItemId = _tokenIds;
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
        idToVaultItem[newItemId] = VaultItem(newItemId, newItemId, payable(address(0)), payable(msg.sender), 0, false, false, tokenURI, "", name, "", false, address(0), false, false, false);
        
        emit VaultItemCreated(newItemId, msg.sender); // EMIT EVENT
        return newItemId;
    }

    function listAsset(uint256 tokenId, uint256 price, string memory description, string memory previewURI, bool useEscrow) public {
        require(ownerOf(tokenId) == msg.sender, "Only owner can list");
        idToVaultItem[tokenId].isListed = true;
        idToVaultItem[tokenId].price = price;
        idToVaultItem[tokenId].seller = payable(msg.sender);
        idToVaultItem[tokenId].description = description;
        idToVaultItem[tokenId].previewURI = previewURI;
        idToVaultItem[tokenId].useEscrow = useEscrow;
        _transfer(msg.sender, address(this), tokenId);
        
        emit AssetListed(tokenId, price); // EMIT EVENT
    }

    function updateListing(uint256 tokenId, uint256 newPrice, string memory newDesc, bool useEscrow) public {
        require(idToVaultItem[tokenId].seller == msg.sender, "Only seller");
        idToVaultItem[tokenId].price = newPrice;
        idToVaultItem[tokenId].description = newDesc;
        idToVaultItem[tokenId].useEscrow = useEscrow;
        
        emit ListingUpdated(tokenId, newPrice); // EMIT EVENT
    }

    function cancelListing(uint256 tokenId) public {
        require(idToVaultItem[tokenId].seller == msg.sender, "Only seller");
        _transfer(address(this), msg.sender, tokenId);
        idToVaultItem[tokenId].isListed = false;
        idToVaultItem[tokenId].seller = payable(address(0));
        idToVaultItem[tokenId].owner = payable(msg.sender);
        idToVaultItem[tokenId].isEscrowActive = false;
        
        emit ListingCancelled(tokenId); // EMIT EVENT
    }

    function buyAsset(uint256 tokenId) public payable {
        uint256 price = idToVaultItem[tokenId].price;
        require(msg.value == price, "Wrong price");
        
        if (idToVaultItem[tokenId].useEscrow) {
            idToVaultItem[tokenId].isEscrowActive = true;
            idToVaultItem[tokenId].buyer = msg.sender;
            idToVaultItem[tokenId].isListed = false;
            emit EscrowUpdate(tokenId, "Start"); // EMIT EVENT
        } else {
            address payable seller = idToVaultItem[tokenId].seller;
            _transfer(address(this), msg.sender, tokenId);
            idToVaultItem[tokenId].owner = payable(msg.sender);
            idToVaultItem[tokenId].isListed = false;
            idToVaultItem[tokenId].seller = payable(address(0));
            seller.transfer(msg.value);
            _itemsSold++;
            emit AssetSold(tokenId, msg.sender, price); // EMIT EVENT
        }
    }

    function confirmTrade(uint256 tokenId) public {
        require(idToVaultItem[tokenId].isEscrowActive, "Not in escrow");
        if (msg.sender == idToVaultItem[tokenId].buyer) idToVaultItem[tokenId].buyerConfirmed = true;
        else if (msg.sender == idToVaultItem[tokenId].seller) idToVaultItem[tokenId].sellerConfirmed = true;

        if (idToVaultItem[tokenId].buyerConfirmed && idToVaultItem[tokenId].sellerConfirmed) {
            address payable seller = idToVaultItem[tokenId].seller;
            address buyer = idToVaultItem[tokenId].buyer;
            _transfer(address(this), buyer, tokenId);
            seller.transfer(idToVaultItem[tokenId].price);
            
            idToVaultItem[tokenId].owner = payable(buyer);
            idToVaultItem[tokenId].seller = payable(address(0));
            idToVaultItem[tokenId].buyer = address(0);
            idToVaultItem[tokenId].isListed = false;
            idToVaultItem[tokenId].isEscrowActive = false;
            idToVaultItem[tokenId].buyerConfirmed = false;
            idToVaultItem[tokenId].sellerConfirmed = false;
            _itemsSold++;
            
            emit AssetSold(tokenId, buyer, idToVaultItem[tokenId].price); // EMIT EVENT
        } else {
            emit EscrowUpdate(tokenId, "Confirm"); // EMIT EVENT
        }
    }

    function cancelTrade(uint256 tokenId) public {
        require(idToVaultItem[tokenId].isEscrowActive, "Not in escrow");
        address payable buyer = payable(idToVaultItem[tokenId].buyer);
        buyer.transfer(idToVaultItem[tokenId].price);
        _transfer(address(this), idToVaultItem[tokenId].seller, tokenId);
        
        idToVaultItem[tokenId].owner = idToVaultItem[tokenId].seller;
        idToVaultItem[tokenId].seller = payable(address(0));
        idToVaultItem[tokenId].buyer = address(0);
        idToVaultItem[tokenId].isListed = false;
        idToVaultItem[tokenId].isEscrowActive = false;
        idToVaultItem[tokenId].buyerConfirmed = false;
        idToVaultItem[tokenId].sellerConfirmed = false;
        
        emit EscrowUpdate(tokenId, "Cancel"); // EMIT EVENT
    }

    function transferAsset(uint256 tokenId, address to) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _transfer(msg.sender, to, tokenId);
        idToVaultItem[tokenId].owner = payable(to);
        emit AssetTransferred(tokenId, msg.sender, to); // EMIT EVENT
    }

    function sendCopy(address to, string memory name, string memory encryptedCid) public {
        _tokenIds++;
        uint256 newItemId = _tokenIds;
        _mint(to, newItemId);
        _setTokenURI(newItemId, encryptedCid);
        idToVaultItem[newItemId] = VaultItem(newItemId, newItemId, payable(address(0)), payable(to), 0, false, true, encryptedCid, "", name, "Shared Copy", false, address(0), false, false, false);
        emit VaultItemCreated(newItemId, to); // EMIT EVENT
    }

    function burnAsset(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _burn(tokenId);
        delete idToVaultItem[tokenId];
        emit AssetBurned(tokenId); // EMIT EVENT
    }

    function getMyAssets() public view returns (VaultItem[] memory) {
        uint totalItemCount = _tokenIds;
        uint itemCount = 0;
        uint currentIndex = 0;
        for (uint i = 1; i <= totalItemCount; i++) {
            if ((idToVaultItem[i].owner == msg.sender || idToVaultItem[i].seller == msg.sender || (idToVaultItem[i].isEscrowActive && idToVaultItem[i].buyer == msg.sender)) && idToVaultItem[i].id != 0) {
                itemCount += 1;
            }
        }
        VaultItem[] memory items = new VaultItem[](itemCount);
        for (uint i = 1; i <= totalItemCount; i++) {
            if ((idToVaultItem[i].owner == msg.sender || idToVaultItem[i].seller == msg.sender || (idToVaultItem[i].isEscrowActive && idToVaultItem[i].buyer == msg.sender)) && idToVaultItem[i].id != 0) {
                uint currentId = i;
                VaultItem storage currentItem = idToVaultItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function getAllListedAssets() public view returns (VaultItem[] memory) {
        uint totalItemCount = _tokenIds;
        uint itemCount = 0;
        uint currentIndex = 0;
        for (uint i = 1; i <= totalItemCount; i++) {
            if (idToVaultItem[i].isListed == true && idToVaultItem[i].isEscrowActive == false) {
                itemCount += 1;
            }
        }
        VaultItem[] memory items = new VaultItem[](itemCount);
        for (uint i = 1; i <= totalItemCount; i++) {
            if (idToVaultItem[i].isListed == true && idToVaultItem[i].isEscrowActive == false) {
                uint currentId = i;
                VaultItem storage currentItem = idToVaultItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
}